# Product Development Requirements (PDR)

## Vision

Single-user personal finance management web PWA. Track VND finances in Vietnam, accessed daily on mobile for entry and weekly/monthly on desktop for review.

## Target User

Owner only. Single-tenant. Gated by Google OAuth + email allowlist.

## Scope — MVP

### Must-Have Features

| Feature         | Notes                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| Transactions    | income / expense / transfer; bottom-sheet quick-add; VND shortcut parser (`50k`, `1.5tr`)   |
| Accounts        | Cash, Bank, Credit Card, E-Wallet (generic types, not app-specific)                         |
| Categories      | Hierarchical; 10 seeded VN-aware buckets (incl. separate Cà phê & Trà)                      |
| Budgets         | Monthly per category; progress bars; over-budget indicator; rollover toggle                 |
| Recurring       | RRULE rules; lazy-generate next instance within 30-day window; edit one vs series           |
| Savings goals   | Virtual buckets within accounts; target amount + date; progress                             |
| Debts/loans     | Separate account/liability type; lifecycle: Open → Partial → Settled                        |
| Reports         | Cash flow over time (excl. transfers), spending by category (hierarchical drill), net worth |
| Data export     | CSV + JSON, all entities, all-time                                                          |
| Telegram alerts | Daily outbound DM for upcoming renewals (3-day lead, configurable per item)                 |

### Out of Scope — Phase 2+

- Receipt photo attachments + OCR
- CSV / Excel statement import (bank statement parsing)
- SMS / Email parsing
- Multi-currency
- Multi-user / shared budgets
- Investment / brokerage tracking
- Telegram bot inbound commands (`/add`, `/list`) — architecture must allow trivial addition
- English UI localization (i18n library such as `next-intl`; UI strings written directly in Vietnamese for MVP)

### Non-Functional

- Locale: Vietnam — DD/MM/YYYY, 24h, Monday week-start.
- Currency: VND only, `Intl.NumberFormat('vi-VN')` → `50.000 ₫`.
- UI language: Vietnamese (Phase 1 MVP). English deferred to Phase 2+.
- Online-only (no offline queue at MVP).
- Mobile-first responsive; desktop layout supported.
- Auth: Google OAuth, email allowlist, single user.
- Hosting: Vercel Hobby (free) + Neon free tier + cron-job.org free.

## Success Criteria

- Log a transaction in ≤3 taps on mobile from PWA home screen.
- Renewal alert arrives via Telegram within 24h of due date.
- Monthly over-spending visible at-a-glance on dashboard.
- CSV + JSON export downloadable from settings at any time.
- Sign-in works via Google OAuth; non-allowlisted email blocked.

## Constraints / Decisions

- Categorical budgeting (Money Lover model), not envelope (YNAB).
- Single-entry transactions with explicit `Transfer` type; transfers excluded from spending reports.
- Lazy RRULE materialization, not eager generation.
- Generic account types at MVP (Bank, E-Wallet); specific apps (Vietcombank, Momo, ZaloPay) deferred.
- Vercel cron disabled on free tier → external `cron-job.org` calls Vercel HTTPS endpoint.

## References

- Architecture: `docs/system-architecture.md`
- Research reports: `plans/reports/`
- Implementation plan: `plans/<timestamp-slug>/` (produced by `/ck:plan --hard`)
