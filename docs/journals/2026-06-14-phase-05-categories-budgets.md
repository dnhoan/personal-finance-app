# Phase 5 Categories & Budgets Completion

**Date**: 2026-06-14
**Severity**: Medium (new surface; spend-tracking correctness)
**Component**: Categories, budgets, category picker
**Status**: Complete (pending commit)

## What Happened

Shipped category tree CRUD (`/settings/categories`), a reusable category picker
wired into quick-add, and the monthly budgets surface (`/budgets`) with progress
bars, over-budget indicators, rollover, and copy-from-last-month — matching
wireframes 07/08. All gates green: typecheck, lint, build (12 routes), 103 tests.

## Technical Details

- **Schema (migration 0002):** added `categories.kind` (enum, default `expense`
  backfills existing rows) + `categories.archived_at` (soft-archive). The plan's
  archive requirement had no column to land on — added it here.
- **Budget spend** buckets on the Phase-3 `occurred_month_ict` generated column
  (`occurred_month_ict = monthStartDate(monthKey)`), never re-deriving the month —
  so the ICT/UTC boundary stays correct (tz-boundary test proves June, not May).
- **Rollover** is computed on read: `effective = amount + max(0, prior.amount −
prior.spent)` when enabled. The list query pulls the prior month alongside the
  current to apply it; nothing is denormalized.
- **copy-from-last-month** is an `INSERT … SELECT … ON CONFLICT DO NOTHING` that
  filters `rollover = false` (rollover cats auto-carry, so copying double-counts).
- **CategoryPicker** is a grouped/indented Radix Select (roots + indented children
  - "no category"), reused in quick-add and kind-filtered; switching the kind
    toggle clears the selection since options are kind-specific.
- **Pure logic** extracted to non-`server-only` modules for unit tests:
  `category-hierarchy.ts` (tree builder), `lib/effective-budget.ts`, `lib/month.ts`,
  `lib/slugify.ts` (Vietnamese diacritic stripping).

## Root Cause Analysis

N/A — clean delivery. One structural choice forced a deviation: testable logic had
to live outside the `server-only` query modules (same pattern as Phase 4's
`repository.ts`), so the tree builder + types moved to `category-hierarchy.ts`.

## Decision Points

- **Add `categories.kind` (user-confirmed)** to back wireframe 07's Chi tiêu/Thu
  nhập tabs, over the simpler no-tab single tree.
- **Rollover toggle in the edit sheet**, not an inline per-row switch (wireframe
  08 showed both a switch and a "tap row to edit" hint) — tap-to-edit wins; avoids
  per-row client state.
- **Budgets list shows only budgeted categories** (wireframe-faithful); add + bulk
  copy cover the rest. Categories page shows month spend but defers the share-bar +
  MoM% delta to Phase 8 (reports).
- **Deferred:** editing an existing tx's category and a category filter on the
  transactions list (the query already accepts `categoryId`).

## Lessons

- When a later phase needs a column an earlier schema didn't anticipate (archive),
  fold the additive migration into the work rather than hacking around it.
- Keep month math in one pure, well-tested module — `occurred_month_ict` +
  `monthStartDate` keeps every spend query on the same ICT calendar key.
