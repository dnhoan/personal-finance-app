# Phase 3 DB Schema & Seeds Completion

**Date**: 2026-06-13
**Severity**: Medium (data model foundation)
**Component**: Database (Drizzle schema, migration, seed)
**Status**: Complete (pending commit)

## What Happened

Authored the full domain schema — 7 entity tables (`accounts`, `categories`,
`transactions`, `recurring_rules`, `budgets`, `goals`) + `cron_state` + 3 pgEnums —
split one file per entity under `src/lib/db/schema/*` behind a barrel. Generated and
applied migration `0001_colossal_ultimatum.sql` to the live Neon branch. Built an
idempotent seed (`db:seed`) for the 10 VN categories + the cron heartbeat row.
All acceptance criteria green: typecheck, lint, 18/18 unit tests (incl a 10-case live
round-trip), migration applied, seed idempotent (10 → 0 on re-run).

## Technical Details

- **Money** is `numeric(18,0)` (VND, no cents); Drizzle returns it as a string, so
  large amounts (tested `9999999999`) round-trip without JS float loss.
- **`occurred_month_ict`** is a STORED generated column —
  `date_trunc('month', occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` — so every
  month-bucketed query (budgets, MTD reports, renewals) reads one uniform value instead
  of re-deriving TZ math. Verified: `2026-05-31T23:30Z` (= 06:30 ICT, June) buckets to `2026-06-01`.
- **Idempotency keys**: partial unique on `client_op_id` (per-submit retry safety) and on
  `(recurring_rule_id, occurred_at)` (idempotent materialisation), both `WHERE … IS NOT NULL`.
- **Self-FKs**: `transactions.transfer_pair_id` (cascade — deleting one transfer leg removes
  its mirror), `categories.parent_id` (restrict). FKs to accounts/categories are RESTRICT;
  all `user_id` FKs cascade on owner delete.
- **`goals` has no `current_amount`** — progress is computed on read; eliminates drift.
- **`cron_state`** is a single-row table pinned by a boolean PK + `CHECK(id)`; a second-row
  insert is rejected (test asserts this).

## Decision Points

- **Identity reuse (user-confirmed).** The plan specified a separate uuid `users` table +
  a lazy upsert on sign-in. But Phase 2's Better Auth already owns a `user` table (text id)
  with the exact fields, and inserts the owner row on first sign-in. Surfaced the conflict;
  user chose to reuse it. Domain `user_id` is now `text` FK → `user.id`; entity PKs stay
  `uuid`. The separate table and the lazy-upsert step were dropped (DRY/KISS).
- **Category seeding via CLI, not auth hook.** The owner signed in during Phase 2 (before
  categories existed), so an on-sign-in seed hook would never have fired for them — the
  `db:seed` CLI is the correct path, and keeps DB writes off the auth hot path.

## Root Cause Analysis

Two issues hit and fixed during the run:

1. **Seed env not loading** — ESM hoists `import` above the inline `loadEnv()` call, so
   `src/lib/env.ts` validated before dotenv ran. Fixed with `scripts/load-env.ts`, a
   side-effect module imported first (import hoisting guarantees it evaluates before the
   db-client import chain).
2. **Seed guard blocked the only valid DB** — the plan's `*neon*dev*` host heuristic was
   unworkable: Neon endpoint hosts (`ep-…-pooler.…neon.tech`) don't encode branch name.
   Relaxed to permit `neon.tech` hosts, block hosts containing `prod`, `--force-prod` overrides.

## Lessons

- Plan heuristics about external infra (hostnames, version pins) should be verified against
  the real provider before being treated as load-bearing.
- When two phases touch the same concept (identity), reconcile against what the earlier phase
  actually built, not what its plan said — and surface the delta to the user rather than
  silently picking.
