# Project Changelog

## Phase 8: UI/UX Improvements (2026-06-27)

### Features Shipped

**Global Theming & Chrome** — System-aware dark mode + accessibility baseline

- Next viewport export with per-scheme `themeColor` (light/dark)
- `color-scheme: light dark` on `:root` + `@media (prefers-color-scheme: dark)` auto-activates `.dark` tokens
- No toggle UI — system preference only
- Heading `text-wrap: balance` for better readability
- Skip-to-content link + `<main id>` for keyboard nav

**Focus/Hover/Touch States** — Full interactive feedback coverage

- Focus-visible rings on all focusable elements
- Hover feedback on buttons, selects, FAB, bottom-nav, filter pills
- Touch targets: `touch-manipulation` + `-webkit-tap-highlight` suppressed
- Select item highlight via `data-[highlighted]` attribute

**Optimistic Delete & Archive** — Improved UX for destructive actions

- Transaction delete: 5s undo toast (via `sonner`), reverted if page unmounts during grace period
- Account archive: immediate toast + `unarchiveAccount` server action for undo
- Single `<Toaster>` in (app) layout; `window.confirm` removed

**Forms Polish** — Validation & input hygiene

- Focus-on-validation-error for better error discovery
- `spellCheck={false}` on numeric/identifier inputs
- Ellipsis placeholders for improved placeholder hints
- Dirty-state discard guard on quick-add & account-form sheets

**List Performance** — Rendering optimization for long transaction lists

- `content-visibility: auto` + `contain-intrinsic-size` on transaction rows
- `overscroll-contain` on sheet body and filter scroller

**Navigation Redesign** — TopBar removal + Settings restructure

- Removed global TopBar component (`top-bar.tsx`, `sign-out-menu-item.tsx` deleted)
- Settings page redesigned: grouped account/appearance/help sections with account header + Sign Out footer
- New `SignOutButton` + `SettingsRow` components for consistent Settings layout
- Account email + Sign Out migrated from TopBar → Settings footer

### UI Updates

- Applied accessibility baseline to all pages
- Transaction delete flows use optimistic undo instead of confirmation dialogs
- Settings navigation consolidated into single grouped layout
- Dark mode automatically enabled on `prefers-color-scheme: dark`

### Tests

- All existing tests pass; no new test files added (refactor + polish scope)
- TypeCheck, lint, build: ✅ clean

### Notes

- Design tokens (colors, spacing, radius, type) unchanged — only chrome/interaction layer updated
- No schema or server-side changes; purely frontend polish
- Sonner toast library now a hard dependency for undo feedback

---

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
