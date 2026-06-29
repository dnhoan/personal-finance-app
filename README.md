# Personal Finance App

A single-user personal finance management **web PWA** for tracking VND finances in Vietnam — mobile-first for daily entry, desktop for weekly/monthly review.

> **Status:** 🚧 In active development. Phase 1 (project scaffold) complete; database schema and features land in later phases. See [Roadmap](#roadmap).

## Features (MVP scope)

| Feature           | Notes                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Transactions**  | Income / expense / transfer; bottom-sheet quick-add; VND shortcut parser (`50k`, `1.5tr`) |
| **Accounts**      | Cash, Bank, Credit Card, E-Wallet                                                         |
| **Categories**    | Hierarchical; VN-aware seeded buckets                                                     |
| **Budgets**       | Monthly per category; progress bars; over-budget indicator; rollover toggle               |
| **Recurring**     | RRULE rules; lazy next-instance generation; edit one vs series                            |
| **Savings goals** | Virtual buckets within accounts; target amount + date                                     |
| **Debts / loans** | Liability type; lifecycle Open → Partial → Settled                                        |
| **Reports**       | Cash flow, spending by category (drill-down), net worth                                   |
| **Data export**   | CSV + JSON, all entities                                                                  |
| **Email alerts**  | Daily email for upcoming renewals via Brevo SMTP (configurable lead time)                 |

**Out of scope (Phase 2+):** receipt OCR, bank statement import, SMS/email parsing, multi-currency, multi-user, investment tracking, English UI.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (CSS-first `@theme`) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- **Database:** [Neon](https://neon.tech/) Postgres (serverless) + [Drizzle ORM](https://orm.drizzle.team/) / drizzle-kit
- **Auth:** Better Auth — Google OAuth gated by email allowlist (single tenant)
- **Notifications:** Email via Nodemailer over [Brevo](https://www.brevo.com/) SMTP relay
- **Testing:** [Vitest](https://vitest.dev/) (unit) + [Playwright](https://playwright.dev/) (e2e)
- **Tooling:** ESLint 9, Prettier, Husky + lint-staged (pre-commit typecheck)
- **Hosting:** Vercel Hobby + Neon free tier + [cron-job.org](https://cron-job.org/) (external cron)

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech/) Postgres database (Singapore region recommended)
- Google OAuth credentials & a free [Brevo](https://www.brevo.com/) account (SMTP relay for email alerts)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values — every var is REQUIRED to boot (validateEnv() fails fast)

# 3. Run database migrations
npm run db:migrate

# 4. Start the dev server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Environment Variables

All variables in `.env.example` are required. The app validates them at startup via Zod (`src/lib/env.ts`) and refuses to boot if any are missing.

| Variable                                    | Purpose                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                              | Neon Postgres connection string                          |
| `BETTER_AUTH_SECRET`                        | Auth signing secret (32+ chars)                          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth                                             |
| `ALLOWED_EMAIL`                             | The single allowlisted owner email                       |
| `BREVO_SMTP_USER` / `BREVO_SMTP_KEY`        | Brevo SMTP relay credentials                             |
| `ALERT_FROM_EMAIL`                          | Verified sender (alerts go to the owner's account email) |
| `CRON_SECRET`                               | Cron endpoint auth (32+ chars)                           |
| `NEXT_PUBLIC_APP_URL`                       | Public app URL                                           |

### Email Alerts (Brevo SMTP)

Daily renewal reminders are sent as email via Brevo's free SMTP relay (300 emails/day — far above a single user's needs). One-time setup:

1. Create a free [Brevo](https://www.brevo.com/) account.
2. **Verify a single sender** — Senders → _Add a sender_ → confirm via the email Brevo sends. This can be your own Gmail; no domain or DNS is required. Use that verified address as `ALERT_FROM_EMAIL`. Brevo rejects sends from unverified senders.
3. SMTP & API → generate an **SMTP key** → set `BREVO_SMTP_USER` (your login email) and `BREVO_SMTP_KEY`.

Alerts are delivered to the rule owner's account email (`user.email`) — the address you signed in with — so there is no separate destination to configure.

### Google OAuth

Sign-in is Google OAuth gated by a single-email allowlist (`ALLOWED_EMAIL`). In the [Google Cloud Console](https://console.cloud.google.com/) → _APIs & Services → Credentials_ → OAuth 2.0 Client:

- **Authorized redirect URI:** `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google` (e.g. `https://<your-app>/api/auth/callback/google`; add `http://localhost:3000/api/auth/callback/google` for local dev).
- Copy the client id/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Install as an App (PWA)

The app is an installable PWA.

- **Android (Chrome):** the browser shows an install prompt automatically; tap _Install_ to add it to the home screen. It then launches standalone (no browser chrome).
- **iOS (Safari):** iOS has no automatic prompt — use **Share → Add to Home Screen**.

The service worker is built only in production (`next start` / deploy); it is disabled in `next dev` to avoid HMR collisions.

### Cron Setup (cron-job.org)

Vercel Hobby has no built-in cron, so an external scheduler hits the renewal endpoint daily. In [cron-job.org](https://cron-job.org/):

- **URL:** `https://<your-app>/api/cron/renewal-check`
- **Method:** `POST`
- **Header:** `Authorization: Bearer <CRON_SECRET>`
- **Schedule:** `0 9 * * *` with timezone `Asia/Ho_Chi_Minh` (09:00 ICT daily)

The endpoint is idempotent (`notified_at` is date-keyed), so extra fires within the same day are no-ops. The dashboard surfaces a heartbeat badge from `cron_state.last_renewal_check_at` so a silently-broken cron is visible.

Smoke test after deploy:

```bash
curl -X POST https://<your-app>/api/cron/renewal-check \
  -H "Authorization: Bearer <CRON_SECRET>"
# → {"processed":N,"sent":N,"claimed_but_failed":N}
```

## Scripts

| Command               | Description                            |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Start dev server                       |
| `npm run build`       | Production build                       |
| `npm run start`       | Run production build                   |
| `npm run lint`        | ESLint                                 |
| `npm run typecheck`   | TypeScript type-check (`tsc --noEmit`) |
| `npm run test`        | Run unit tests (Vitest)                |
| `npm run test:watch`  | Unit tests in watch mode               |
| `npm run test:e2e`    | Run e2e tests (Playwright)             |
| `npm run db:generate` | Generate Drizzle migrations            |
| `npm run db:migrate`  | Apply migrations                       |
| `npm run db:studio`   | Open Drizzle Studio                    |

## Project Structure

```
src/
├── app/                 # Next.js App Router (layout, pages, globals.css)
├── components/ui/       # shadcn/ui components
└── lib/
    ├── db/              # Drizzle client + schema
    ├── env.ts           # Zod-validated environment config
    └── utils.ts
drizzle/                 # Migration metadata
docs/                    # PDR, architecture, design guidelines, journals
e2e/ · tests/            # Playwright & Vitest suites
```

## Conventions

- **Locale:** Vietnam — DD/MM/YYYY dates, 24h time, Monday week-start.
- **Currency:** VND only, formatted via `Intl.NumberFormat('vi-VN')` → `50.000 ₫`.
- **UI language:** Vietnamese (MVP).

## Roadmap

- [x] **Phase 1** — Project scaffold (Next.js, Drizzle/Neon, shadcn/ui, testing, tooling)
- [ ] **Phase 2** — Auth & app shell (Google OAuth, allowlist gate, dashboard layout)
- [x] **Phase 3** — Database schema & core entities
- [x] **Phase 4** — Transactions, accounts, quick-add (VND parser, atomic transfers)
- [ ] **Phase 5** — Budgets, recurring, goals, debts
- [ ] **Phase 6** — Reports, export, email alerts
- [x] **CI/CD & Deploy** — GitHub Actions gates (lint·typecheck·migrate-check·unit·build·gitleaks), Vercel Git-integration deploy, gated Neon prod migrations, runbook ([`docs/deployment-guide.md`](docs/deployment-guide.md)). _Live account setup pending — see runbook §2._

See [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) for full requirements and [`docs/system-architecture.md`](docs/system-architecture.md) for architecture.

## License

Private — single-user project.
