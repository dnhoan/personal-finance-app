# Project Changelog

## Phase 7: Goals & Debts (2026-06-20)

### Features Shipped

**Goals** — Virtual savings buckets within accounts

- CRUD actions: `createGoal`, `updateGoal`, `archiveGoal`
- Read queries: `getGoalProgress`, `listGoalsWithProgress`, `listActiveGoals`
- Zod validation in `schemas.ts`
- UI components: goal-list, goal-row (with SVG progress ring), goal-form-sheet, goal-picker
- Page: `/goals`
- Progress computed at read time: `SUM(transactions.amount) WHERE goal_id=$g AND user_id=$u` — no denormalised cache
- Transactions tagged to goals manually via quick-add sheet (income/expense only; transfers omitted)
- `createTransaction` validates goal ownership before linking

**Debts & Receivables** — Liability and asset accounts

- Debt accounts track money owed (paid down with expense transactions)
- Receivable accounts track money owed to you (collected with income transactions)
- Status computed from balance: `debtStatus(remaining, initial)` → open/partial/settled
- Queries: `listDebtsWithBalance` (direction-aware)
- UI components: debt-list (active/settled/all segment filter), debt-row
- Page: `/debts`
- Pure utility: `lib/debt-status.ts` — `debtStatus()`, `debtPaidRatio()`

### Schema Changes

- **enum `account_type`** gained `receivable` (asset, owed to you)
- **balance convention** (debt/receivable):
  - Debt/receivable balance = `initial_balance − settled`
  - Counts down to 0 as obligation clears
  - Feeding net worth: `groupAccounts()` subtracts debt balances (as liabilities), counts receivables as assets
  - Spending accounts keep original signed-sum formula
- **index** `transactions(goal_id, user_id)` for goal-progress queries
- **migration 0003:** Added `receivable` enum value; created goal/user index

### UI Updates

- Settings ("More") page gained Goals + Debts nav rows
- Transaction revalidation now also revalidates `/goals` and `/debts` paths

### Tests

- `tests/debts/debt-status.test.ts` — 11 unit cases
- `tests/features/goals/progress-query.test.ts` — 3 integration cases
- `tests/debts/account-balance.test.ts` — 2 integration cases
- All tests: ✅ green (110 unit + 25 integration); typecheck, lint, build pass

### Notes

- Test infrastructure: added `tests/stubs/server-only.ts` + vitest alias for importing server-only query modules in integration tests
- No stored `status` field on debt/receivable accounts — computed purely from balance at read time (back-dating and deletes always re-derive correctly)
- Goal progress includes all transaction kinds (income, expense, transfers with a goal tag) — design choice: "manual marking" model

---

## Previous Phases

- **Phase 1–6** — See `plans/` directory for archived phase documentation.
