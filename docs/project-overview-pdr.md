# Product Development Requirements (PDR)

## Vision

Multi-user personal finance management web PWA. Track VND finances in Vietnam, accessed daily on mobile for entry and weekly/monthly on desktop for review. Any Google account can sign up; each user gets a fully isolated workspace.

## Access Model

Open multi-user. Any Google account can sign up and gets a fully isolated workspace. Optional `SIGNUP_ENABLED` environment flag (default `true`) acts as a non-destructive rollback lever to halt NEW user creation without affecting existing users.

## Scope — MVP

### Must-Have Features

| Feature         | Notes                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transactions    | income / expense / transfer; bottom-sheet quick-add; VND shortcut parser (`50k`, `1.5tr`)                                                             |
| Accounts        | Cash, Bank, Credit Card, E-Wallet (generic types, not app-specific)                                                                                   |
| Categories      | Hierarchical; 10 seeded VN-aware buckets (incl. separate Cà phê & Trà)                                                                                |
| Budgets         | Monthly per category; progress bars; over-budget indicator; rollover toggle                                                                           |
| Recurring       | RRULE rules; lazy-generate next instance within 30-day window; edit one vs series                                                                     |
| Savings goals   | Virtual buckets within accounts; target amount + date; progress                                                                                       |
| Debts/loans     | Separate account/liability type; lifecycle: Open → Partial → Settled                                                                                  |
| Reports         | Cash flow over time (excl. transfers) with MoM delta, spending by category (hierarchical drill) with MoM delta, net worth (12-month trend + snapshot) |
| Data export     | CSV + JSON, all entities, all-time                                                                                                                    |
| Telegram alerts | Daily outbound DM for upcoming renewals (3-day lead, configurable per item)                                                                           |

### Out of Scope — Phase 2+

- Receipt photo attachments + OCR
- CSV / Excel statement import (bank statement parsing)
- SMS / Email parsing
- Multi-currency
- Shared budgets / family features
- Investment / brokerage tracking
- Telegram bot inbound commands (`/add`, `/list`) — architecture must allow trivial addition
- English UI localization (i18n library such as `next-intl`; UI strings written directly in Vietnamese for MVP)

### Non-Functional

- Locale: Vietnam — DD/MM/YYYY, 24h, Monday week-start.
- Currency: VND only, `Intl.NumberFormat('vi-VN')` → `50.000 ₫`.
- UI language: Vietnamese (MVP). English deferred to Phase 2+.
- PWA installable: offline-capable via service worker (read-only auth routes cached, HTML navigations fallback to /offline)
- Mobile-first responsive; desktop layout supported.
- Auth: Google OAuth, open signup, per-user isolation.
- Hosting: Vercel Hobby (free) + Neon free tier + cron-job.org free.

## Success Criteria

- Log a transaction in ≤3 taps on mobile from PWA home screen.
- Renewal alert arrives via email within 24h of due date.
- Monthly over-spending visible at-a-glance on dashboard.
- CSV export downloadable from settings at any time.
- Sign-in works via Google OAuth; any account accepted (configurable via `SIGNUP_ENABLED`).

## Constraints / Decisions

- Categorical budgeting (Money Lover model), not envelope (YNAB).
- Single-entry transactions with explicit `Transfer` type; transfers excluded from spending reports.
- Lazy RRULE materialization, not eager generation.
- Generic account types at MVP (Bank, E-Wallet); specific apps (Vietcombank, Momo, ZaloPay) deferred.
- Vercel cron disabled on free tier → external `cron-job.org` calls Vercel HTTPS endpoint.

## MVP Completion Status

All must-have features shipped as of 2026-07-02 (Phase 11 — Multi-User Migration):

- ✅ Transactions (income, expense, transfer; quick-add; VND parser; per-user isolation)
- ✅ Accounts (cash, bank, credit card, e-wallet, debt, receivable types)
- ✅ Categories (hierarchical, 10 seeded VN-aware; per-user isolation)
- ✅ Budgets (monthly per category, progress bars, rollover)
- ✅ Recurring (RRULE, lazy materialization, edit one vs series)
- ✅ Savings goals (virtual buckets, progress tracking)
- ✅ Debts/loans (liability tracking, open→partial→settled lifecycle)
- ✅ Reports (cash flow MoM, spending drill-down, net worth trend)
- ✅ Data export (CSV, all entities, all-time)
- ✅ Email alerts (daily renewal alerts, 3-day lead, configurable; per-user delivery)
- ✅ PWA (offline-capable service worker, manifest, icon set)
- ✅ Accessibility (WCAG AA audit, axe-core scan, error boundaries)
- ✅ Multi-user (open Google signup, per-user workspace isolation, kill-switch via `SIGNUP_ENABLED`)

Success criteria: all 5 criteria met (transaction entry ≤3 taps, email alerts within 24h, dashboard overspending visible, export downloadable, OAuth open-signup with kill-switch).

## References

- Architecture: `docs/system-architecture.md`
- Changelog: `docs/project-changelog.md`
- Research reports: `plans/reports/`
- Implementation phases: `plans/` directory
