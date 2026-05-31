# Personal Finance App

A single-user personal finance management **web PWA** for tracking VND finances in Vietnam — mobile-first for daily entry, desktop for weekly/monthly review.

> **Status:** 🚧 In active development. Phase 1 (project scaffold) complete; database schema and features land in later phases. See [Roadmap](#roadmap).

## Features (MVP scope)

| Feature             | Notes                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Transactions**    | Income / expense / transfer; bottom-sheet quick-add; VND shortcut parser (`50k`, `1.5tr`) |
| **Accounts**        | Cash, Bank, Credit Card, E-Wallet                                                         |
| **Categories**      | Hierarchical; VN-aware seeded buckets                                                     |
| **Budgets**         | Monthly per category; progress bars; over-budget indicator; rollover toggle               |
| **Recurring**       | RRULE rules; lazy next-instance generation; edit one vs series                            |
| **Savings goals**   | Virtual buckets within accounts; target amount + date                                     |
| **Debts / loans**   | Liability type; lifecycle Open → Partial → Settled                                        |
| **Reports**         | Cash flow, spending by category (drill-down), net worth                                   |
| **Data export**     | CSV + JSON, all entities                                                                  |
| **Telegram alerts** | Daily DM for upcoming renewals (configurable lead time)                                   |

**Out of scope (Phase 2+):** receipt OCR, bank statement import, SMS/email parsing, multi-currency, multi-user, investment tracking, English UI.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (CSS-first `@theme`) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- **Database:** [Neon](https://neon.tech/) Postgres (serverless) + [Drizzle ORM](https://orm.drizzle.team/) / drizzle-kit
- **Auth:** Better Auth — Google OAuth gated by email allowlist (single tenant)
- **Notifications:** Telegram Bot API
- **Testing:** [Vitest](https://vitest.dev/) (unit) + [Playwright](https://playwright.dev/) (e2e)
- **Tooling:** ESLint 9, Prettier, Husky + lint-staged (pre-commit typecheck)
- **Hosting:** Vercel Hobby + Neon free tier + [cron-job.org](https://cron-job.org/) (external cron)

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech/) Postgres database (Singapore region recommended)
- Google OAuth credentials & a Telegram bot token (for auth and alerts)

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

| Variable                                                       | Purpose                                  |
| -------------------------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL`                                                 | Neon Postgres connection string          |
| `BETTER_AUTH_SECRET`                                           | Auth signing secret (32+ chars)          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                    | Google OAuth                             |
| `ALLOWED_EMAIL`                                                | The single allowlisted owner email       |
| `BOT_TOKEN` / `TELEGRAM_OWNER_USER_ID` / `TELEGRAM_DM_CHAT_ID` | Telegram alerts                          |
| `WEBHOOK_SECRET` / `CRON_SECRET`                               | Webhook + cron endpoint auth (32+ chars) |
| `NEXT_PUBLIC_APP_URL`                                          | Public app URL                           |

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
- [ ] **Phase 3** — Database schema & core entities
- [ ] **Phase 4** — Transactions, accounts, categories
- [ ] **Phase 5** — Budgets, recurring, goals, debts
- [ ] **Phase 6** — Reports, export, Telegram alerts

See [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) for full requirements and [`docs/system-architecture.md`](docs/system-architecture.md) for architecture.

## License

Private — single-user project.
