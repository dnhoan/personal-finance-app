# Reports & Dashboard: Net-Worth Aggregation, Monthly Cash Flow, Charts

**Date**: 2026-06-27 15:45
**Severity**: Medium (new analytics feature, depends on Phase 7 queries)
**Component**: Dashboard, Reports (net-worth trends, monthly cash flow), Recharts integration
**Status**: Complete (all tests green; uncommitted)

## What Happened

Built Reports & Dashboard feature: net-worth summary card (total assets, liabilities, net worth with sparkline), net-worth trend line chart (6-month history), monthly cash-flow breakdown (income, expenses, net by category), and a searchable transaction table. All queries use verified Phase 7 account aggregation logic (`listAccountsWithBalance`, `groupAccounts`); dashboard reads ICT month buckets with transfer exclusion. Typecheck + lint clean, 19 routes active, 14 unit + 5 live-Neon integration tests passing.

## The Brutal Truth

Planning phase had a **buried self-contradiction** that almost shipped broken. The spec told us to write a naive signed-sum `accountBalances` query (step 100), but the same plan's Key Insights section **explicitly forbade it** — double-counts receivables and inverts debt sign. This should have been caught during planning. The frustrating part is the plan was read by both of us and neither caught the inconsistency until implementation. Solution: locked in the verified Phase 7 decision (user had confirmed it), reused that query logic instead. Lesson: contradictions in plans need explicit resolution _before_ code starts, not discovered mid-flight.

Design-token naming also wasted ~30 min: plan referenced `var(--fg-subtle)` but actual Tailwind v4 `@theme` tokens are `var(--color-fg-subtle)` / `--color-income` / etc. Charts read these inline for system dark-mode support. A quick grep of the codebase would have caught it; the plan should have verified token names from the live stylesheet first.

## Technical Details

**Net-Worth Sign Correctness (Critical):**

Phase 7 `listAccountsWithBalance` returns accounts grouped by type; `groupAccounts` applies type-specific sign rules (assets +, liabilities -, receivables +, debts -). Dashboard net-worth = assets + receivables - liabilities - debts. Two tests verify this:

- Baseline: assets 1000, liabilities 500, receivables 200, debts 100 → net 600 ✓
- Transfer neutrality: transfer 100 between accounts doesn't change net ✓

Transfers explicitly filtered from all flow aggregates (`kind != 'transfer'`), verified by integration test against live Neon.

**Timezone Discipline — ICT Month Bucket:**

Every monthly cash-flow query reads the generated `occurred_month_ict` column. Live test: 2026-05-31 23:30 UTC transaction correctly buckets into ICT June (UTC+7). Query filters on indexed `occurred_month_ict`, not computed month-from-timestamp.

**Design Tokens — Recharts Integration:**

Charts read CSS variables inline (`getComputedStyle(document.documentElement)`). Tokens:

- `--color-income` (green), `--color-expense` (red), `--color-net` (slate)
- `--color-fg-subtle` (chart axis labels)
- `--color-bg-card` (chart background)

System dark mode flips these via `@media (prefers-color-scheme: dark) :root` — no JS theme state needed. Custom `chart-theme.ts` exports theme object + compact options (reduced margins, smaller fonts) + `prefers-reduced-motion` support.

**Recharts 3.9 — No shadcn Generator:**

No `components.json` in repo, so `npx shadcn add chart` wasn't viable. Hand-rolled `chart-theme.ts` (65 lines) instead of fighting the generator. Recharts is just a dependency, not a shadcn/ui component — cleaner than trying to scaffold through a broken generator.

**Date Range Filtering (Index-Friendly):**

Custom-range cash-flow filter now uses indexed `occurred_month_ict` for start month; `to` clamped to today (prevents future-dateless queries). Avoids full-table scans on date comparisons.

## Decisions

**Reuse Phase 7 Query Logic Over Naive Sum:**

When plan contradiction surfaced, chose to trust the verified Phase 7 decision (user had explicitly approved the type-specific sign rules). Rewrote plan step 100 to compose existing queries instead of inventing a new one. Trade-off: adds 2 extra SQL calls (one per group); negligible for current data volume.

**Inline CSS Vars Over Theme Context:**

Recharts charts read `getComputedStyle()` at render time. Trade-off: no JS state machine for theme switching; charts automatically respect system preference + respects CSS var updates. Simpler than passing a theme context through the chart component tree.

**Custom Theme Object Over shadcn Integration:**

Built `chart-theme.ts` manually. Trade-off: ~65 lines of custom code; avoids dependency on `components.json` scaffolding which wasn't configured for this repo.

## Root Cause Analysis

**Plan Self-Contradiction:**

Plan Key Insights correctly identified the sign-flip risk of naive summation, but step 100 contradicted that insight by specifying exactly that approach. Root: planning phase didn't have a verification step to catch internal inconsistencies. Both planner and reader assumed the plan was internally consistent.

**Token Naming Drift:**

Plan referenced `var(--fg-subtle)` from memory of a Tailwind v3 naming scheme; actual v4 schema uses `--color-` prefix. Root: plan wasn't verified against the _current_ codebase stylesheet at write time.

## Impact

- Net-worth aggregation: correct signs (verified by tests); transfers excluded from flows.
- Dashboard render: 4 top-level queries (net-worth summary, trend, monthly flows, transaction list) + 0 N+1 issues (all batch queries).
- Perf: no noticeable delay on 1000+ transactions (Recharts 3.9 renders efficiently; chart theme is static CSS vars, not computed).
- Code health: typecheck + lint clean; code review found no critical/high findings. One medium (M1 — custom date filter optimized to use indexed column). One low (L1 — `to` clamped to today).

## Lessons Learned

- **Plan contradictions need explicit resolution protocol.** When plan Key Insights conflict with plan Implementation steps, surface the conflict to the user _before_ coding. Don't assume the plan is internally consistent.
- **Verify token names against live code.** Plan phase references to CSS vars should be spot-checked against `globals.css` or `@theme` at plan-write time, not discovered during chart integration.
- **Reuse verified queries over inventing new ones.** Phase 7 sign-flip logic was locked in and tested; composing it eliminates a source of bugs vs. writing a parallel aggregation function.
- **Inline CSS vars for design-system-aware components.** Recharts + inline CSS var reads = automatic dark-mode support without theme context boilerplate.

## Next Steps

- Monitor monthly cash-flow query perf as historical data grows (1000+ months); may need query-time aggregation if Recharts struggles with large datasets.
- If users request custom date ranges that exceed current month buckets, consider adding a `dateRange` parameter to cash-flow query.
- Test on low-light / high-contrast system preferences; ensure chart colors meet WCAG AA for both light and dark modes.

---

**Status:** Complete (uncommitted at journal time; all tests green; ready for code review)

**Summary:** Reports & Dashboard built with net-worth aggregation (correct signs via Phase 7 logic), monthly cash-flow breakdown, and Recharts charts. Plan self-contradiction caught and resolved by locking to verified decision. Token naming drift corrected. All integration tests passing.

**Concerns:** None; typecheck + lint + all 19 tests pass. Code review flagged M1 (date filter index usage — fixed) and L1 (clamp `to` to today — fixed).
