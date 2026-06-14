# Phase 05: Wireframe Navigation & Account Detail Routing

**Date**: 2026-06-14 14:00
**Severity**: Low
**Component**: Navigation, Accounts List & Detail Page
**Status**: Resolved

## What Happened

Executed pre-validated 3-phase plan (plans/260613-account-detail-and-nav-routing/) to ship the bottom navigation wiring and account detail page. All 4 tabs now resolve: dashboard, transactions, accounts, and settings. Accounts list redesigned with Assets/Liabilities grouping and balance subtotals. New /accounts/[id] detail page matches wireframe with gradient hero, transaction history, and month-level stats.

Commit: `6297c76` on main.

## The Brutal Truth

This was textbook execution—no surprises, no fire-fighting. The pre-validated plan worked because we got the architecture right before coding: ownership-scoped queries, cache layer for dual consumption, transfer filtering at the SQL level, backward-compatible QuickAddSheet props. The type safety of Drizzle + App Router typedRoutes eliminated routing bugs before they happened.

Only complaint: the deferred debt-account detail page (/debts) creates a temporary routing lie—debt rows link to /accounts/[id] now, which is wrong semantically. It works, but it's technical debt that will sting during UAT if a stakeholder notices account vs. debt behavior diverges.

## Technical Details

**Phase 1 — Navigation stubs**: Created /settings (links to /accounts) and /budgets placeholder. Dropped dead `as Route` casts in BottomNav component; TypeScript's `typedRoutes` now guarantees all 4 href values resolve.

**Phase 2 — Accounts list redesign**:

- Replaced flat list with total-balance summary card + two collapsible groups
- Split logic: `type === "debt" ? "Liabilities" : "Assets"` (not balance sign) — negative credit cards stay in Assets
- `groupAccounts()` helper (pure, 5 unit tests) locks the grouping rule; shared `AccountActionsMenu` prevents duplication
- Rows link to detail; menu is a sibling (no nested interactive elements, accessibility ✓)

**Phase 3 — Account detail page**:

- `getAccountMonthStats()` filters on generated `occurred_month_ict` column (canonical ICT month boundary, no bespoke tz math); transfers excluded via SQL `FILTER(WHERE kind != 'transfer')`
- `getAccountWithBalance()` is ownership-scoped (returns null → notFound(), no data leak) and wrapped in React `cache()` so generateMetadata + page render share one query (code-review L1 finding, applied)
- QuickAddSheet mounted directly (not via QuickAddLauncher) to avoid duplicate FAB; gained optional `defaultAccountId`/`defaultKind` props (backward-compatible, existing callers unaffected)
- Revalidation triggered from both `accounts/actions.ts` AND `transactions/actions/revalidate.ts` (Session-1 validation finding: tx mutations must refresh detail stats/balance/history)

## What We Tried

Single path—the plan validation caught all design questions upfront. No failed approaches.

## Root Cause Analysis

N/A—smooth execution. The only friction point was a code-review finding (cache sharing) that was immediately obvious once flagged; this suggests the design benefited from peer review before implementation.

## Lessons Learned

1. **Validate routing architecture before coding.** TypeScript typedRoutes + Drizzle ownership-scoped queries eliminated whole categories of bugs at compile time.

2. **Dual-consumer queries need cache discipline.** When a server component consumes a query twice (generateMetadata + page), wrap in `cache()` at the data layer—it's invisible to callers and eliminates async waterfalls.

3. **Revalidation scope is non-obvious.** Debt mutations and transfers live in transactions/actions, but they affect accounts detail pages. Document the revalidation dependency graph explicitly, or this becomes a silent data-staleness bug.

4. **Deferred features create routing inconsistency.** Debt rows linking to /accounts/[id] (instead of /debts/[id]) works, but it's a white lie. Schedule the /debts page NOW, or accept tech debt visibility for UAT.

## Next Steps

1. **Interim**: Debt account detail routes to /accounts/[id]; semantically wrong but functional. Switch to /debts/[id] when Phase 7 ships.

2. **Deferred wireframe fields**: masked account number, credit limit, "primary" flag, last-updated timestamp require new schema columns—out of scope for this phase.

3. **UAT validation**: Confirm Assets/Liabilities grouping aligns with stakeholder mental model; negative credit cards in Assets may surprise.

---

**Status**: DONE
**Summary**: Completed navigation wiring, accounts list redesign, and account detail page per pre-validated plan. All tests (75 total, 5 new) and production build clean; zero critical/high/medium code-review findings.
