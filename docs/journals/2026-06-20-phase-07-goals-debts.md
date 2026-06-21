# Phase 7 Goals & Debts Completion

**Date**: 2026-06-20
**Severity**: High (new features; correctness on balance + net worth)
**Component**: Goals, debts, account balance computation
**Status**: Complete (committed; migration applied)

## What Happened

Shipped virtual savings buckets (`/goals`) and debt/receivable tracking (`/debts`).
Goals let users tag transactions (income/expense only) with a goal and track progress
via SVG progress ring; toggle active/archived. Debts model both liabilities ("you owe")
and receivables ("owed to you") in a single account type, with direction-aware balance
computation and segmented filter (active/settled/all). All gates green: typecheck, lint,
build, 110 unit + 25 integration tests; migration `drizzle/0003_smiling_jetstream.sql` applied.

## Technical Details

**Goals:**

- No denormalized cache. Progress = `SUM(transactions.amount) WHERE goal_id=? AND user_id=?` at read.
  Eliminates balance drift on tx delete/backdate. `createTransaction` validates goal ownership before linking.
- Quick-add gains optional `goal_id` (expense/income only). Page `/goals` with active/archived toggle.
  Progress ring renders via SVG arc + percentage text.

**Debts:**

- Pure `debtStatus(remaining, initial)` → `open | partial | settled`, computed at read (no stored status).
- Balance formula: `remaining = initial − settled`. Accounts with `account_type='debt'` (liability) pay
  down via expense; `account_type='receivable'` (asset) collect via income.
- `listDebtsWithBalance` uses direction-aware aggregate (`FILTER (WHERE account_type = 'debt')` vs
  `'receivable'`) to route flow correctly.
- Page `/debts` with segmented filter (active/settled/all).

## Decision Points

**Enum Widening — Debt Direction (User-Confirmed):**

- User wanted both "you owe" and "owed to you" in MVP scope.
- Chose adding `receivable` to the existing `account_type` enum (over a separate direction column or sign encoding).
  - `debt` = liability, paid down by expense.
  - `receivable` = asset, collected by income.
  - `debtStatus` + `listDebtsWithBalance` are direction-aware via FILTER predicates.

**Compute-at-Read Pattern (Already Established):**

- Extended from budgets + recurring rules. No materialized debt/goal cache. Simplifies correctness.

## Root Cause Analysis — Latent Bug Surfaced

The enum widening exposed a dormant balance-computation bug in `listAccountsWithBalance`:

- **Pre-bug:** `balance = initial + SUM(income − expense)`, which made a debt show as **positive** (flipping its sign), adding to net worth instead of subtracting.
  A receivable collection would double-count: adding as an income transaction _and_ inflating the receivable balance.
- **Root:** The `groupAccounts` helper had been written assuming debt balances are **negative** — a sign convention the runtime never produced.
  Pre-existing, dormant until a debt-creation UI shipped and typechecker complained about `Record<AccountType, …>` maps.
- **Fix:** Debt/receivable balance = `initial − settled` (counts down to 0). Debts subtract from net worth; receivables are assets.
  Added regression test `tests/debts/account-balance.test.ts`.

## Impact

- Enum widening forced updates to every `Record<AccountType, …>` discriminated union + the balance SQL — caught by typecheck + code review.
- Net-worth sign convention exposed as a **product decision**, not a silent patch. User confirmed fix-now.
- Test infra: `server-only` modules can't import under vitest. Added `tests/stubs/server-only.ts` + alias so query modules are directly testable.

## Lessons

- Shared enums have real blast radius: all pattern matches + aggregate filters need updating.
  Caught by comprehensive typecheck + code review, not feature-specific tests alone.
- Compute-at-read (goals, debts, budgets) keeps correctness straightforward at the cost of query frequency.
  Acceptable for this scale; cache later if perf demands it.
- Latent bugs hide in discrepancies between code convention (negative debt balance) and runtime output (positive).
  Only surface when a new feature exercises the dormant path. Typechecker + human review caught it.
