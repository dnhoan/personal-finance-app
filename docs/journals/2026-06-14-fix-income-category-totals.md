# Fix: Income Category Totals Always Zero

**Date**: 2026-06-14
**Severity**: Medium (spend/income-tracking correctness on a shipped surface)
**Component**: Categories (`/settings/categories`), transaction revalidation
**Status**: Complete (pending commit)

## What Happened

On the categories manager, adding an income transaction to an income category
(e.g. "Lương") never moved that category's monthly total — it stayed at 0 in the
Thu nhập tab. The expense tab worked.

## Root Cause Analysis

Two defects in the same blast radius (both produce "total doesn't update"):

1. **Hardcoded kind in the per-category sum.** `spentByCategory` in
   `features/categories/queries.ts` summed transactions with `AND kind = 'expense'`.
   Both the expense AND income trees were built from this one function
   (`listCategoryTree(user, 'expense')` and `(user, 'income')`), so income
   categories always received an empty totals map → rendered `spent = 0`. The
   income tree shared an expense-only aggregate.

2. **Categories page not revalidated after a tx write.** `revalidateTxViews`
   refreshed dashboard / transactions / accounts but not `/settings/categories`.
   Even with defect 1 fixed, the page would show stale totals until a hard
   refresh — affecting both expense and income totals.

## Fix

- Renamed `spentByCategory` → `amountByCategory`; parameterised the filter to the
  tree's kind (`AND kind = ${kind}`). Income trees now aggregate income.
- Added `revalidatePath("/settings/categories")` to `revalidateTxViews`.
- Regression test (`tests/categories/hierarchy.test.ts`): an income-keyed amount
  map yields income totals on the tree — documents that `buildCategoryTree` is
  kind-agnostic, so the caller must supply the correct kind's amounts.

## Verification

104/104 tests pass; typecheck + lint clean. No public contract change — the
`CategoryNode` tree shape is unchanged, and `totalExpenseForMonth` was correctly
expense-only (only feeds the expense-tab header) and was left as-is.

## Lessons

- A `kind`-agnostic tree builder reused for two kinds must get a `kind`-scoped
  aggregate — a hardcoded filter in the shared query silently zeroed one branch.
- Every surface that reads a transaction-derived total must be in
  `revalidateTxViews`; the categories page was added late (Phase 5) and missed.

## Open Questions

- `CategoryNode.spent` now holds "received" for income categories. Field left
  named `spent` to keep the fix minimal; rename to `total` deferred unless the
  ambiguity proves confusing.
