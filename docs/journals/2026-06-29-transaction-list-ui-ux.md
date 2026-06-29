# Transaction List UI/UX: Day Grouping, Summary, Filter Chips, Load-More

**Date**: 2026-06-29
**Severity**: Medium (UI/UX enhancement on an existing surface; additive query contracts, no schema change)
**Component**: Transactions list page, account-detail history, dashboard recent list, transactions query/aggregate layer
**Status**: Complete (uncommitted; cook workflow via plans/260629-1016-transaction-list-ui-ux/)

## What Happened

Executed the 5-phase transaction-list UI/UX plan, bringing the `/transactions` screen up to the intended design: a day-grouped ledger with per-day net subtotals, a period summary band, chip-based filters with a clear-filters control, loading skeletons on filter nav, and "load more" pagination replacing the old hard 100-row cap. Also removed a stray `import { console } from "inspector/promises"` on the page.

All gates green: typecheck clean, lint clean, 168/168 tests pass (12 new), production build succeeds.

## Technical Details

**Pure utilities (Phase 1):**

- `lib/group-by-day.ts` — buckets a newest-first `TxListItem[]` into per-ICT-day groups (stable `YYYY-MM-DD` key for React/merge), each carrying a relative label, a `DD/MM/YYYY` date label, and a net subtotal (`+income − expense`, transfers contribute 0).
- `lib/relative-day-label.ts` — `Hôm nay` / `Hôm qua` / Vietnamese weekday (within 6 days) / `DD/MM/YYYY`, compared on ICT calendar dates (not raw ms) so labels never drift across the UTC boundary. `now` injectable for tests.
- Extracted the day-bucketing that was inline in `grouped-transaction-list.tsx` so the main list and account-detail share one impl.

**Server contracts (additive):**

- `summariseTransactions(userId, filter)` — DB `SUM … FILTER (WHERE kind=…)` aggregate over the SAME shared `filterConditions` builder as the list, so the summary band stays accurate regardless of pagination. `net = income − expense`, transfers excluded.
- `listTransactionsPage(userId, filter)` — fetches `limit + 1`, trims, returns `{ items, hasMore }` (avoids the false "more" when the row count is an exact multiple of the page size).
- `actions/load-more-transactions.ts` — server action behind `requireSession`; re-validates the client filter with `txFilterSchema`, floors+clamps the offset, forces the server-owned page size (50). Client offset/filter never trusted.

**Components:**

- `transaction-day-groups.tsx` — shared presentational ledger (day header `relative · date` left, signed net subtotal right; rows below). `card` prop wraps each day for account-detail; main list stays full-bleed.
- `transaction-summary.tsx` — Thu / Chi / Còn lại band from the aggregate.
- `filter-chip.tsx` — shared chip (≥44px, `aria-pressed`, focus ring) for both the range and kind rows; kind `Select` → chips; added `hasActiveFilters` → "Xóa bộ lọc" clear control.
- `transaction-list-skeleton.tsx` + route `loading.tsx` — single skeleton path (segment loading) during filter round-trips; `animate-pulse` disabled under reduced-motion.
- `transaction-ledger.tsx` — client list owning accumulated items; recomputes `groupTransactionsByDay` over the full array each render so a load-more page that lands on an existing day merges in and that day's subtotal recomputes automatically.

## Decisions & Gotchas

- **`TransactionList` kept flat, not grouped.** The plan intended it to become grouped, but after Phase 5 the main page uses the new `TransactionLedger`, leaving `TransactionList` used ONLY by the dashboard "recent" section. Grouping it would have silently redesigned the dashboard. Reverted to flat.
- **`TransactionRow.showDate` (default true).** Switching row meta to time-only assumed a day header is always present. The dashboard (flat) has none, so a default-true `showDate` keeps full date+time there; grouped surfaces pass `showDate={false}`.
- **Pagination tie-break (review High finding).** `listTransactions` ordered by `occurredAt DESC` only; OFFSET load-more could skip/duplicate rows sharing an `occurredAt` (transfer legs, quick-adds defaulting to now). Added `id DESC` as a deterministic secondary sort. Matching composite index deferred (tie groups are tiny).
- **Account-detail subtotal — transfers excluded** (confirmed with user). On a single-account view a transfer is real flow for that account, but kept the plan-wide `income − expense` rule for consistency.
- **Known limitation (accepted):** offset pagination can drift if rows are added/removed between "Tải thêm" clicks. Fine for a single-user app; keyset pagination is a possible future follow-up.

## Tests

- `tests/features/transactions/group-by-day.test.ts` — order preservation, subtotal sign + transfer exclusion, transfer-only day, ICT midnight split, load-more merge across a day boundary.
- `tests/features/transactions/relative-day-label.test.ts` — today/yesterday/weekday/older + ICT midnight boundary; `ictDateKey`.
- DB-backed `summariseTransactions` / `listTransactionsPage` paths covered by typecheck + build (no new integration suite added).
