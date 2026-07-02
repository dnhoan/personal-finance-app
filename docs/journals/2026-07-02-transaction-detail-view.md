# Transaction Detail View: /transactions/[id]

**Date**: 2026-07-02 17:15
**Severity**: Low (additive read path + frontend; no schema/write-path change)
**Component**: Transactions feature (detail route, detail query, ledger row navigation)
**Status**: Complete (3 phases, all gates green, code-reviewed)

## What Happened

Executed plan `260702-1619-transaction-detail-view` via `/cook`. Added a read-only
per-transaction detail screen at `/transactions/[id]`, reachable by tapping a ledger row,
mirroring the established `accounts/[id]` pattern (server page → `notFound()` on non-owned
id, hero + back link + overflow menu). Edit/delete reuse the existing `TransactionEditSheet`
and `deleteTransaction` action. Three phases: (1) data layer — `getTransactionDetail` +
`TxDetail`, transfer counterpart resolution, revalidate-path fix; (2) route + UI —
header/facts components, page + loading skeleton; (3) ledger-row `<Link>` navigation +
verification. typecheck, lint (changed files), test:unit 184/184, DB-coupled detail-query
integration 4/4 vs live DB, and e2e 5/5 all pass. Code review found no blocking defects.

## Technical Details

**Data layer (`queries.ts`):**

- Extracted the inline list projection into a shared `txListSelection` const so
  `listTransactions` and `getTransactionDetail` read identical columns — the list output is
  byte-identical after the refactor (verified in review).
- `getTransactionDetail(userId, id)`: single-row `WHERE id = $id AND user_id = $u` →
  `null` when absent (caller maps to `notFound()`, no row-level leak). Left-joins `goals`
  for a `goalName` facts chip.
- Transfer counterpart: a second PK lookup on `transferPairId`, also scoped to `user_id`
  (defense in depth). Source/destination resolved by leg sign per the signed-storage
  invariant in `actions/transfer.ts` (out-leg negative = source). Missing mate → `transfer`
  stays null, UI falls back to the single-account row.

**Revalidation (`actions/revalidate.ts`):**

- Added `revalidatePath("/transactions/[id]", "page")` so an edit/delete refreshes the
  detail view (previously only `/transactions` was covered for the list).

**UI (`transaction-detail-header.tsx`, `transaction-detail-facts.tsx`, `page.tsx`,
`loading.tsx`):**

- Hero amount in Fraunces (`var(--font-serif)`), kind color + sign (U+2212 minus);
  transfers neutral / sign-less. Overflow menu: Edit (income/expense only, hidden for
  transfers), Delete → house `ConfirmDialog` → `deleteTransaction` → `router.push`.
- Facts = essentials + goal chip (account/transfer from→to, category, time, note, merchant,
  type, recurring, goal). No audit timestamps (dropped in plan Validation Session 1).

**Ledger row navigation (`transaction-row.tsx`):**

- Wrapped the icon/title/amount cluster in a Next `<Link>` (`as Route`); kept
  `TransactionRowActions` a sibling (not nested) so the dropdown trigger never activates the
  link. Preserved `content-visibility`/`contain-intrinsic-size` row culling and the
  optimistic-delete + undo timer (with unmount-flush) untouched.

## Decisions

**Delete-from-detail has no undo toast.** The row you'd undo into is off-screen after
navigating; delete confirms then routes to `/transactions`. Undo stays on the list.

**Recurring edit on detail = plain sheet only.** The this-instance-vs-series
`EditInstanceDialog` stays exclusively on the row menu — an intentional asymmetry,
commented in the header component.

**DB-coupled test placement.** `detail-query.test.ts` hits a live Neon branch, so it was
added to `test:integration` and excluded from the no-DB `test:unit` run, consistent with
the sibling transaction integration tests.

**e2e scope.** The authed happy path (list → tap → detail → back) can't be Playwright-driven
under the allowlist-OAuth flow (documented repo constraint), so Phase 3 added a detail-route
auth-gate e2e; the authed detail behavior is covered by the integration test.

## Impact

- New read-only detail screen for every income/expense/transfer transaction.
- Ledger rows are now tappable navigation; overflow menu behavior unchanged.
- No schema change, no new write path, no public-contract change (`TxListItem`,
  `TransactionEditSheet`, `GroupedTransactionList` untouched).

## Lessons Learned

- **Extract shared projections when a second reader appears.** One `txListSelection` const
  keeps list + detail columns in lockstep; a future column reaches both reads at once.
- **Scope ownership on every SELECT, including derived lookups.** The transfer mate is
  same-owner by construction, but the query still filters `user_id` — never trust the FK
  alone for a tenant boundary.

## Next Steps

- (Repo-wide, optional) Wrap single-row reads (`getTransactionDetail`,
  `getAccountWithBalance`) in React `cache()` to dedupe the `generateMetadata` + page body
  double-fetch — raw Drizzle calls aren't request-deduped like `fetch`. Pre-existing pattern,
  low urgency.
- (Repo-wide, optional) Edit sheet sources `listActiveAccounts`, so a tx on a since-archived
  account shows an empty account picker until changed. Shared with the list row; out of scope.

---

**Status:** Complete (3 phases; typecheck + lint + unit + DB integration + e2e all green;
code review: no blocking defects).

**Summary:** Added `/transactions/[id]` read-only detail (hero amount, facts, transfer
from→to, edit/delete) mirroring `accounts/[id]`; wired ledger-row tap navigation; ownership-
scoped detail query with transfer-counterpart resolution.

**Concerns:** Two non-blocking pre-existing patterns noted (double-fetch, archived-account
edit picker), both repo-wide and shared with sibling surfaces — out of this feature's scope.
