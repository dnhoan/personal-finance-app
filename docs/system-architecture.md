# System Architecture

Personal finance management web PWA. Single-user, Vietnam locale, VND-only, Vietnamese UI (English deferred Phase 2+).

Last updated: 2026-06-29 (Phase 8 UI/UX improvements + net-worth trend shipped).

## Tech Stack (Locked)

| Layer     | Pick                             | Why                                                       |
| --------- | -------------------------------- | --------------------------------------------------------- |
| Framework | Next.js 15 App Router            | RSC + Server Actions, App Router mature                   |
| Language  | TypeScript (strict)              | Inference for Drizzle + Zod, end-to-end types             |
| ORM       | Drizzle                          | Edge-friendly, small bundle (~7 KB), owned migrations     |
| Database  | Neon Postgres                    | Scale-to-zero, branching, Singapore region                |
| Auth      | Better Auth                      | Google OAuth + email allowlist via callback               |
| UI        | shadcn/ui + Tailwind v4          | Copy-not-install, owned components                        |
| Charts    | Recharts                         | Ships with shadcn/ui charts block                         |
| Forms     | React Hook Form + Zod            | Same schema on client + server                            |
| PWA       | Serwist + @serwist/next          | Active successor to next-pwa                              |
| Bot       | grammY (Telegram)                | TS-first, `webhookCallback("std/http")` serverless-native |
| Cron      | cron-job.org → Vercel HTTPS      | Free; Vercel Hobby tier no longer runs crons              |
| Testing   | Vitest (unit) + Playwright (e2e) | Standard combo, MSW for API mocks                         |
| Hosting   | Vercel (Hobby tier)              | Zero ops, free, SGP edge                                  |

## High-Level Topology

```
[ Browser PWA (Next.js client) ]
            |
            v
[ Vercel Next.js (Edge/Node Functions, Server Actions) ]
            |
            v
[ Neon Postgres (Singapore region) ]

[ cron-job.org ] ----daily POST + CRON_SECRET---->  [ /api/cron/renewal-check ]
                                                            |
                                                            v
                            [ api.telegram.org/bot<token>/sendMessage ]
                                                            |
                                                            v
                                                    [ User's Telegram DM ]

[ Telegram servers ] ----webhook POST + secret header----> [ /api/telegram ]
                                              (grammY router; allowlist by chat_id)
```

## Auth Boundary

Implemented in Phase 2 (Better Auth `1.6.16`, Google-only). Three enforcement layers:

- **Sign-in allowlist** (`lib/auth.ts`): `databaseHooks.user.create.before` (first sign-in) + `databaseHooks.session.create.before` (every returning sign-in) call the pure `assertAllowlisted()` gate (`lib/auth-allowlist.ts`) — requires `emailVerified === true` and case/whitespace-normalised `email === ALLOWED_EMAIL`. Failure throws `APIError(FORBIDDEN)`; no user row / no session is created. Client routes rejects to `/unauthorized` via `errorCallbackURL`.
- **Middleware** (`middleware.ts`, edge): cheap session-cookie _presence_ check via `getSessionCookie`; missing → `302 /sign-in?from=<path>`. No DB. Matcher excludes `/api/auth`, public auth pages, and PWA assets.
- **`requireSession()`** (`lib/auth-session.ts`, server-only, React-`cache`d): authoritative per-call check — validates the session server-side AND re-runs the allowlist (catches cookie replay + `ALLOWED_EMAIL` rotation). **Every Server Action / Route Handler that touches data MUST call it first** — middleware does not cover Server Functions.
- Better Auth's own tables (`user`, `session`, `account`, `verification`) live in `lib/db/auth-schema.ts`. Session cookie: `httpOnly`, `sameSite=lax`, `secure` in prod, 30-day rolling (`updateAge` 1 day).
- `/api/cron/*` — protected by shared secret `CRON_SECRET` header.
- `/api/telegram` — protected by `X-Telegram-Bot-Api-Secret-Token` header (grammY verifies).

## Data Model (Summary)

Identity: domain tables anchor `user_id` (text) to Better Auth's `user` table — a
single identity source, no separate domain `users` table. Domain schema lives in
`lib/db/schema/*.ts` (one file per entity, barrel-exported via `schema.ts`).

Core entities:

- `accounts` — `type` enum: `cash | bank | credit_card | e_wallet | debt | receivable`. `debt` = liability (you owe); `receivable` = asset (owed to you). `status` enum for debt/receivable lifecycle (open/partial/settled/archived). Balance derived from transactions — spending accounts use signed sum; debt/receivable use `initial_balance − settled` (counting down to zero as obligation clears).
- `categories` — hierarchical, `parent_id` self-FK (restrict, depth-2 cap enforced in app), unique `(user_id, slug)`, `kind` (income/expense), `archived_at` soft-archive, seed-list 10 VN-aware expense buckets.
- `transactions` — `kind` enum: `income | expense | transfer`. `transfer_pair_id` self-FK (cascade) links transfer pairs; `client_op_id` partial-unique for retry idempotency; `recurring_rule_id` (set null) links materialised instances; `occurred_month_ict` is a STORED generated column (`date_trunc('month', occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`) so every month-bucketed query reads a uniform value.
- `recurring_rules` — `rrule` string (RFC 5545, with DTSTART embedded), `next_due`, `notified_at` (alert idempotency), `last_materialised_at` (materialisation cursor), `lead_days`, `active`. **Lazy materialisation:** reading `/recurring` or `/transactions` (and the cron renewal check) calls `materialiseDueInstances`, which expands each due rule's occurrences within a 30-day lead window into real `transactions` rows. Idempotent via the `(recurring_rule_id, occurred_at)` partial-unique index; concurrency-safe via a per-rule `pg_advisory_xact_lock`. Occurrences anchor at 12:00 UTC (= 19:00 ICT) so the VN calendar day and `occurred_month_ict` bucket stay deterministic without TZID machinery (VN has no DST). Edit semantics: "this only" detaches the row (`recurring_rule_id` → null); "edit series" mutates the rule forward, never rewriting already-materialised rows.
- `budgets` — unique `(user_id, category_id, period_month)`, `amount`, rollover toggle.
- `goals` — `name`, `target_amount`, `target_date`, `account_id`. Virtual savings buckets. Progress is **computed on read** (`SUM(transactions.amount) WHERE goal_id=$g AND user_id=$u`) — no `current_amount` denorm cache. Transactions tag a goal manually (income/expense only; transfers omit). Index `transactions(goal_id, user_id)` backs the read.
- `cron_state` — single-row heartbeat (boolean PK + `CHECK(id)`); `last_renewal_check_at` written by the renewal cron, surfaced on dashboard cron-status badge (red warning if >25h stale).

Money fields are `numeric(18,0)` (VND has no fractional cents) and round-trip as
strings to avoid JS float precision loss. All `user_id` FKs cascade on owner delete;
FKs to accounts/categories use `RESTRICT`. Migrations applied via `drizzle-kit migrate`
(no `db:push`); seed via `npm run db:seed` (idempotent).

## Analytics & Reporting

Reports module (`src/features/reports/`) provides financial insights via time-scoped queries and interactive charts. All queries are user-scoped and leverage the `occurred_month_ict` stored-generated column for consistent month bucketing.

**Core Queries** (`queries.ts`)

- `netCashFlowMtd()` — Current month inflow vs. outflow (transfers excluded), used in hero card
- `netCashFlowMoM()` — Current and previous month cash flows for delta calculation
- `netWorthSnapshot()` — Aggregate account balances grouped by type (accounts, debts, receivables), used in net-worth card
- `topCategoriesThisMonth()` — Top 5 expense categories by sum this month, used in top-categories card
- `upcomingRenewals()` — Next 30 days of due recurring transactions, used in upcoming-renewals card
- `cashFlowSeries()` — Daily/weekly/monthly income vs. expense historical series (time-range scoped), feeds cash-flow-chart
- `cronHeartbeat()` — Reads `cron_state.last_renewal_check_at`, used to calculate staleness for cron-status-badge

**Net-Worth Trend** (`net-worth-trend-query.ts` & `lib/delta.ts`)

- `netWorthTrend(userId, months)` — Historical net worth derived purely on read from transaction history. Per-month balance is computed as `initial_balance` + cumulative signed transactions up to that month-end, grouped by account type per the same convention as `netWorthSnapshot()` (assets/liabilities). **Key architecture decision:** no snapshot table, migration, or backfill — fully derived via a single windowed SQL query (`generate_series` of month-ends × per-account cumulative sums). The current-month output is verified to equal `netWorthSnapshot().net` in tests to ensure sign convention consistency. Known limitation: accounts use their current status across the entire window (acceptable for single-user scale).
- `computeDelta(current, previous)` — Pure helper to calculate month-over-month deltas (income/expense colored)

**Spending Breakdown** (`spending-by-category-query.ts`)

- `spendingByCategoryQuery()` — Category-level expense aggregation within a date range
- `spendingTotalForRange()` — Total spending for a given date range (used for MoM delta calculation)
- Supports drill-down: user selects donut slice to focus on sub-category transactions
- "Khác" (Other) category cap: limits chart to top 8 categories + rolls remaining into "Other"
- URL-state drill: `?category=slug` persists drill-down selection for shareable reports

**Time-Range Presets** (`lib/range-presets.ts`)

- Predefined ranges: this month (mtd), last month, last 3 months, last 12 months, custom date picker
- `formatRangeLabel()` — Human-readable range description (e.g. "Jun 1–Jun 29, 2026")
- `previousRange()` — Resolve preceding equivalent period for delta calculation (e.g. last month when showing MTD)
- `MAX_MONTHS_BACK` — Exported constant (24 months) enforced as DoS protection + hard cap for trend queries
- User-selectable via range-picker component (dropdown + custom date inputs)

**Shared Report Primitives** (`src/features/reports/components/`)

- `stat-delta.tsx` — Month-over-month delta display with income/expense coloring
- `section-title.tsx` — Report section heading with consistent styling
- `empty-state.tsx` — First-run state with CTA linking to account setup
- `skeleton.tsx` — Loading placeholder for report data
- `report-page-header.tsx` — Page title + range label for report surfaces

**Chart Components** (`components/`)

- `hero-net-cash-flow.tsx` — MTD cash flow hero with large "XYZ VNĐ" display, Fraunces 40 weight; includes MoM delta
- `net-worth-card.tsx` — Net worth snapshot with account breakdown (spending/debt/receivable split); includes mini sparkline + MoM delta
- `top-categories-card.tsx` — Top 5 expense categories bar chart
- `upcoming-renewals-card.tsx` — Upcoming transactions list with renewal dates
- `cash-flow-chart.tsx` — Recharts ComposedChart (income bars + expense line) over time
- `spending-donut.tsx` — Recharts PieChart with drill-down + URL-state persistence; legend shows amount + %
- `net-worth-trend-chart.tsx` — Recharts AreaChart of 12-month net-worth history with sr-only data table
- `range-picker.tsx` — Dropdown presets + custom date input
- `report-tabs.tsx` — Navigation between /reports/cash-flow, /reports/spending, /reports/net-worth
- `chart-theme.ts` — CSS-var token definitions (--color-income, --color-expense, etc.) + reduced-motion support

**Accessibility** (`chart-data-table.tsx`)

- WCAG fallback: `<table aria-label="">` with sr-only data for all charts
- Screen readers receive tabular representation of chart data
- Copy-friendly: users can select/export data via table

**Theming**

- Charts use CSS custom properties (var(--color-income), var(--color-expense)) for dynamic coloring
- Dark mode: automatic via `:root .dark` selector (no per-chart re-render required)
- Respects `prefers-reduced-motion`: animations disabled system-wide

## Module Structure

```
src/
  app/                  # Next.js App Router
    (auth)/             # Sign-in/out routes
    (app)/              # Authed dashboard + features
      reports/          # /reports/cash-flow, /reports/spending, /reports/net-worth
    api/
      telegram/route.ts # grammY webhook
      cron/             # Cron endpoints
  components/
    ui/                 # shadcn/ui primitives
    forms/              # RHF wrappers
    charts/             # Recharts wrappers
  features/
    transactions/       # CRUD + queries
    accounts/           # Account management + grouping
    categories/         # Hierarchical categories
    budgets/            # Monthly budget tracking
    recurring/          # Bill/subscription materialization
    goals/              # Savings buckets
    debts/              # Liability/asset tracking
    reports/            # Analytics queries + chart components + net-worth trend
    dashboard/          # Dashboard layout + cron health
  lib/
    auth.ts             # Better Auth + allowlist
    db/                 # Drizzle client + schema + migrations
    vnd.ts              # parser + formatter
    telegram.ts         # sendMessage helper
  server/               # server-only utils
```

## Open Items (defer to live test during scaffold)

- Vietnam → Neon SGP region latency (ping from machine post-deploy).
- Neon scale-to-zero cold-start UX impact.
- CSV export performance at >10K rows.
- VAPID/web-push readiness if future phase adds browser-push.

## References

- `plans/reports/researcher-domain-data-model.md`
- `plans/reports/researcher-tech-stack.md`
- `plans/reports/researcher-telegram-bot.md`
- `plans/reports/researcher-pwa-vn-ux.md`
