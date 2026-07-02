# Multi-user Phase 1: Write-path Ownership Guards & Idempotency Index

**Date:** 2026-07-02
**Scope:** Ship ownership validation for transaction CRUD + idempotency isolation. Phase 1 of multi-user feature: hard-stop IDORs, widen unique constraints to per-user scope, validate in integration tests.
**PR:** #22 on `feat/multi-user-open-signup` (base: `main`).

## What shipped

- `features/transactions/lib/assert-tx-refs-owned.ts` — guard functions validating transaction/account/category/goal ownership before mutation. Five entry points: `assertTxOwned` (by tx id), `assertAccountOwned`, `assertCategoryOwned`, `assertGoalOwned`, `assertAllRefsOwned` (composite check for create/update). Each throws 401 Unauthorized if user_id mismatch or ref missing.
- Migration 0005 — widened `transactions.clientOpId` unique index from single-column `(clientOpId)` to composite `(user_id, clientOpId)`, enabling per-user idempotency.
- Updated `insertTxIdempotent()` + `insertTransferAtomic()` — both `onConflictDoNothing` clauses now target the new composite index. These are the only two functions that rely on clientOpId idempotency.
- Integration test `transactions.ownership-isolation.test.ts` — 8 cases: user A cannot create tx referencing user B's account/category/goal, cannot update/delete user B's tx, cannot initiate transfer from user B account, transfer creates ownership-checked debit+credit. clientOpId idempotency works per-user (user A + user B both retry same op id → different rows).
- PR #22 review board: 0 defects, 3x gate passes (typecheck/build/lint + 243 tests).

## The red-team finding that rewrote the plan

Initial plan (3 phases: retire allowlist, provision users, fanout cron) assumed isolation was already enforced because the schema has userId FKs on every table + aggregates double-join `t.user_id = a.user_id`. Red-team adversarial pass (24 raw findings → 15 distinct, 0 rejected) **disproved** this. Two genuine write-path holes:

**Hole 1: No ownership check on account/category/goal FK references.** The `createTransaction`, `updateTransaction`, `initiateTransfer` server actions accepted client-supplied `accountId`, `categoryId`, `goalId` with zero validation they belong to the requesting user. An attacker could craft a request: `{accountId: "user_b_acct_42", amount: 100, ...}` and create a transaction on another user's account. Worse: the transaction table has `ON DELETE RESTRICT` on both accountId and categoryId FKs. If user A's transaction references user B's account, user B cannot delete their account — a denial-of-service vector.

**Hole 2: Idempotency index was global, not per-user.** The `clientOpId` unique index on `(clientOpId)` alone let two users with the same operation ID collide. User A retries clientOpId=`abc`, User B also uses `abc` — the second insert hits the existing unique row (from user A) and `onConflictDoNothing` silently succeeds but doesn't insert user B's row. The response looks identical to user B, but the DB has no record of their transaction. Network retry logic masked this as a logic bug in the driver or app layer.

Both holes are genuinely exploitable. Lesson: **"the schema has userId everywhere" does not imply write paths validate ownership. Audit the action code, not just the schema shape.** A half-migrated codebase is riskier than a greenfield multi-tenant design.

This finding expanded the plan from Phase 1 (retire allowlist) to Phase 1 (hardening) + Phase 2 (provisioning) + Phase 3+ (fanout, etc.).

## The debugging breakthrough: `replace_all` indentation trap

After migration 0005 shipped and the composite index deployed, the idempotency + isolation tests failed deterministically:

```
Error: there is no unique or exclusion constraint matching the ON CONFLICT specification
  at Function.PgError [as code]
  at /node_modules/.pnpm/node_modules/pg/lib/client.js:...
```

Both index (database-side) and Drizzle schema (code-side) were composite `(user_id, clientOpId)`. Raw SQL `INSERT ON CONFLICT (user_id, clientOpId) DO NOTHING` worked. Inline Drizzle code with `.onConflictDoNothing({ target: [transactions.userId, transactions.clientOpId] })` worked. But importing the repo's `insertTxIdempotent()` function failed 5/5 times on the same DB connection.

I burned 4+ hours chasing a phantom Neon connection-pooler cached-plan theory. The contrast (raw=OK, inline=OK, imported-fn=ERR) finally triggered a source-of-truth check.

**Root cause:** My earlier `Edit` command used `replace_all: true` with an `old_string` containing 6-space indentation:

```
      target: transactions.clientOpId,
```

This matched _only_ the nested `onConflictDoNothing` call inside `insertTransferAtomic()`. The 4-space-indented block in `insertTxIdempotent()` was silently left on the old single-column index:

```
    target: transactions.clientOpId,  // ← Still the old version
```

So when tests called `insertTxIdempotent()`, the function tried `ON CONFLICT (clientOpId)` (single-column) against a composite index (user_id, clientOpId) → constraint mismatch → error.

**Takeaways:**

1. **`replace_all` with indentation-specific `old_string` can partially apply** across differently-indented call sites. After a multi-site replacement, re-read the file or verify all replacements succeeded. The tool did exactly what I asked (replace all exact-match strings), but I failed to notice the indentation varied.
2. **"Works inline but fails via imported function on same DB" is a file-state mismatch signature.** Before blaming pooler caching, driver bugs, or connection state, diff the source file against your mental model. A function can look correct in your head but have stale code on disk.

Fix: manually re-edited `insertTxIdempotent()` to the correct composite index target. Tests passed on re-run.

## Three architecture decisions locked in

**1. Ownership guards are centralized, not scattered in controllers.** All five guards live in one module with consistent error handling (401, explicit message). Action code calls `assertAllRefsOwned(userId, refs)` once; if any check fails, the action throws before touching the database. This prevents the `ON DELETE RESTRICT` trap (client sees "account deletion failed" instead of finding themselves in a stuck transaction).

**2. Idempotency is per-user, not global.** The composite `(user_id, clientOpId)` index ensures retries are idempotent per user without cross-tenant collision. No additional application logic needed; the database constraint does the work. This unblocks lazy-provisioning (users can act before they're explicitly invited — retries won't double-insert).

**3. Integration test spans the ownership + idempotency boundary.** A single test verifies both that user A cannot touch user B's data AND that the same op id behaves correctly across two users. This catches the "ownership is sound but idempotency leaks data" edge case.

## Gates

typecheck ✅ · build ✅ · eslint ✅ · 243 tests ✅ (8 new ownership-isolation + existing suite).

## Open / deferred to later phases

- **Better Auth `create.after` commit ordering:** The red-team flagged that if a user signs up and immediately sends a transaction request, the user record might not be visible in the transaction action's DB query (race between auth side-effect and app mutation). Mitigation: empirically verify on staging; fallback is lazy-provisioning in Phase 2 (don't require user row to exist, insert on first request). Not yet confirmed safe — Phase 2 will nail this down.
- **Cron fan-out for <10 users:** The current cron processes all transactions in a single job. Phase 2+ will batch by user and fan out; current scope doesn't hit the limit so deferred.
