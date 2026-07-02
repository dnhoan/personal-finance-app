# Codebase Summary

Personal finance web PWA built with Next.js 15, TypeScript, Drizzle ORM, Neon Postgres, Better Auth, shadcn/ui, Recharts, and Serwist (offline-capable).

Last updated: 2026-07-02

## Project Overview

Multi-user Vietnamese personal finance application (open Google signup). Each user manages their own transactions, recurring bills, budgets, savings goals, debts/receivables, and financial analytics. Locale: Vietnam (VND, ICT timezone). UI: Vietnamese (English deferred). Deployment: Vercel Hobby.

## Core Architecture Patterns

### Authentication & Authorization

- Better Auth 1.6.16 with Google OAuth open signup; `SIGNUP_ENABLED` kill-switch (optional, default true)
- Per-call server-side session validation (`requireSession()`) — enforced on all data-touching Server Actions
- Middleware edge-level cookie check; validates session ownership
- Lazy provisioning on first sign-in: new users auto-seeded with default categories + Cash account (idempotent, atomic)
- All domain queries anchor to `user_id` with FKs cascading on owner delete

### Data Model Strategy

- Single identity source: Better Auth's `user` table (no separate domain `users` table)
- Domain schema one-file-per-entity in `lib/db/schema/*.ts`, barrel-exported via `schema.ts`
- Money fields: `numeric(18,0)` (no fractional VND); round-trip as strings to JS to avoid float precision loss
- Generated columns for deterministic bucketing: `occurred_month_ict` (stored, pre-computed via timezone-aware truncation)

### Query Optimization

- Lazy materialization of recurring transactions (30-day lead window, idempotent via partial-unique index)
- Advisory locks per recurring rule to ensure concurrency-safe expansion
- Computed fields at read time (goal progress, debt status) — no denormalized caches
- Index strategy: FK lookups, `(user_id, entity_id)` for user-scoped reads, `(goal_id, user_id)` for goal progress

### Frontend Patterns

- Server Components as default; Client Components only where needed (form interaction, client-side state)
- Server Actions for mutations — direct DB access, automatic user-scope validation
- React Hook Form + Zod for client/server schema unification
- Recharts for chart rendering; CSS-var theming for automatic dark mode
- Optimistic UI: delete/archive with sonner undo toasts (5s grace period)

### State Management

- URL state for filters/drill-downs (shareable, stateless)
- React `cache()` for per-request memoization
- Form state via React Hook Form (no Redux/Zustand)

## Feature Modules

```
src/features/

  accounts/
    ├── queries.ts, actions.ts, schemas.ts
    ├── account-grouping.ts (balance rollup + net-worth aggregation)
    ├── account-meta.ts (metadata + status derivation)
    └── components/ (account-list, account-form-sheet, account-row, etc.)

  categories/
    ├── queries.ts, actions.ts, schemas.ts
    ├── category-hierarchy.ts (parent-child validation, depth-2 cap)
    ├── category-icons.ts (emoji/icon mappings)
    └── components/ (category-picker, category-tree, etc.)

  transactions/
    ├── queries.ts, actions.ts, schemas.ts
    ├── transaction-kind.ts (income/expense/transfer classification)
    ├── transfer-pairing.ts (bidirectional linking logic)
    └── components/ (transaction-list, add/ capture screen + numeric keypad, etc.)

  recurring/
    ├── queries.ts, actions.ts, schemas.ts
    ├── materialisation.ts (lazy expansion via advisory lock)
    ├── rrule-parsing.ts (RFC 5545 parsing, DTSTART embedding)
    └── components/ (recurring-form-sheet, etc.)

  budgets/
    ├── queries.ts, actions.ts, schemas.ts
    ├── effective-budget.ts (rollover logic)
    └── components/ (budget-form-sheet, budget-list, etc.)

  goals/
    ├── queries.ts, actions.ts, schemas.ts
    ├── progress.ts (read-time aggregation)
    └── components/ (goal-form-sheet, goal-row, etc.)

  debts/
    ├── queries.ts, actions.ts, schemas.ts
    ├── debt-status.ts (open/partial/settled derivation)
    └── components/ (debt-list, debt-row, etc.)

  reports/
    ├── queries.ts (netCashFlowMtd, netCashFlowMoM, netWorthSnapshot, etc.)
    ├── net-worth-trend-query.ts (derived-on-read 12-month trend via windowed SQL)
    ├── spending-by-category-query.ts (donut breakdown + spendingTotalForRange helper)
    ├── lib/
    │   ├── range-presets.ts (time-range controls + formatRangeLabel + previousRange)
    │   └── delta.ts (computeDelta helper)
    └── components/ (stat-delta, section-title, empty-state, skeleton, report-page-header, net-worth-trend-chart, etc.)

  dashboard/
    ├── lib/cron-health.ts (staleness check)
    └── components/ (cron-status-badge, etc.)

  export/
    └── CSV streaming of transactions via /api/export/csv

  pwa/
    ├── Serwist 9 service worker (offline-capable, versioned caching)
    ├── Manifest (standalone, icon set, theme color)
    └── Offline fallback page

  help/
    ├── help-content.ts (shared VN guide data + WELCOME_TIP_IDS teaser subset)
    ├── use-welcome-seen.ts (localStorage first-run flag + pure storage helpers)
    └── components/ (help-section-card, welcome-dialog + re-open button)
```

## Pages & Routes

**Auth Routes** (`(auth)`)

- `/sign-in` — OAuth redirect
- `/unauthorized` — access denied fallback (legacy; signup always allowed unless `SIGNUP_ENABLED=false`)

**App Routes** (`(app)`, authed)

- `/` — Dashboard (hero, net worth, top categories, upcoming renewals, recent txs, cron badge)
- `/accounts` — Account list with balance/status
- `/transactions` — Full transaction history with filters; tap a row → `/transactions/[id]` read-only detail (hero amount, facts, transfer from→to, edit/delete)
- `/add` — Dedicated capture screen (numeric keypad, pre-filled context, optimistic save)
- `/recurring` — Bill/subscription management
- `/budgets` — Monthly budget tracking
- `/categories` — Category hierarchy
- `/goals` — Savings goal list + progress
- `/debts` — Debt/receivable list + status
- `/reports/cash-flow` — Income vs. expense over time
- `/reports/spending` — Category drill-down (donut, historical)
- `/reports/net-worth` — Net worth snapshot
- `/help` — In-app Vietnamese usage guide (one card per feature); linked from Settings, host of the first-run welcome re-open button
- `/settings` — Account, appearance, help (sign-out)

**API Routes**

- `/api/auth/*` — Better Auth endpoints
- `/api/export/csv` — Stream transactions as CSV (UTF-8 BOM, dd/MM/yyyy dates, formula-injection safe)
- `/api/cron/renewal-check` — Daily renewal materialization + email alert fan-out (per-user, via Brevo SMTP)

**PWA & Offline**

- Service Worker (`src/sw/index.ts`) — Serwist 9 runtime caching
  - NetworkOnly: auth routes + API (always fresh)
  - CacheFirst: static assets (immutable)
  - NetworkFirst (3s timeout): HTML navigations → /offline
- `public/manifest.json` — PWA install metadata
- `public/offline` — Offline fallback page (no auth required)

## Tech Stack

| Layer        | Choice                      | Key Details                                             |
| ------------ | --------------------------- | ------------------------------------------------------- |
| Framework    | Next.js 15 App Router       | RSC + Server Actions                                    |
| Language     | TypeScript (strict)         | End-to-end types + inference                            |
| ORM          | Drizzle                     | Owned migrations, ~7 KB bundle                          |
| Database     | Neon Postgres (SGP region)  | Scale-to-zero, branching                                |
| Auth         | Better Auth 1.6.16          | Google OAuth open signup + `SIGNUP_ENABLED` kill-switch |
| UI Framework | shadcn/ui + Tailwind v4     | Copy-not-install, owned components                      |
| Charts       | Recharts 3.9.0              | CSS-var theming, auto dark mode                         |
| Forms        | React Hook Form + Zod       | Client/server schema unification                        |
| PWA          | Serwist + @serwist/next     | Active next-pwa successor                               |
| Email        | Brevo SMTP relay            | Free tier, per-user alert delivery                      |
| Cron         | cron-job.org → Vercel HTTPS | Free; Hobby tier no cron support                        |
| Testing      | Vitest (unit) + Playwright  | MSW for API mocks                                       |
| Hosting      | Vercel Hobby                | Zero ops, free, SGP edge                                |

## Database Schema Essentials

**Identity**

- `user` — Better Auth managed; domain queries FK to `user_id`

**Core Entities**

- `accounts` — type: cash/bank/credit_card/e_wallet/debt/receivable; balance derived from transactions
- `categories` — hierarchical (parent_id, depth-2 cap); kind: income/expense
- `transactions` — kind: income/expense/transfer; transfer_pair_id links pairs; `occurred_month_ict` stored-generated for bucketing
- `recurring_rules` — RFC 5545 rrule; lazy materialization with advisory locking
- `budgets` — monthly rollover logic
- `goals` — virtual buckets; progress computed on read
- `cron_state` — single-row heartbeat for renewal check staleness

## Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "drizzle-orm": "latest",
    "zod": "latest",
    "recharts": "^3.9.0",
    "shadcn-ui": "copy-based",
    "serwist": "latest",
    "grammY": "latest",
    "better-auth": "^1.6.16"
  },
  "devDependencies": {
    "typescript": "strict",
    "vitest": "latest",
    "playwright": "latest"
  }
}
```

## Development Workflows

**Setup**

- `npm install` — Install dependencies
- `npm run db:push` — Apply Drizzle schema (dev only)
- `npm run db:seed` — Idempotent backfill seed (categories + default account per user)
- `.env.local` — Copy `.env.example`, add secrets (API keys, `SIGNUP_ENABLED` optional, etc.)

**Development**

- `npm run dev` — Next.js dev server
- `npm run type-check` — TypeScript validation
- `npm run lint` — ESLint (prioritize functionality over strict style)
- `npm run test` — Vitest unit + integration tests
- `npm run test:e2e` — Playwright browser tests

**Deployment**

- Vercel: auto-deploy on push to main
- Migrations run via `db:push` pre-deploy (edge: Vercel runner)
- Secrets injected via Vercel environment variables
- Build: `next build` (no custom build script)

## Code Standards

- **File naming**: kebab-case with descriptive purpose names
- **File size**: Keep components/utilities under 200 LOC; split larger features into modules
- **Server vs. Client**: Default to Server Components; use `'use client'` only for interactivity
- **Error handling**: Try-catch blocks; custom `APIError` for API responses
- **Comments**: Explain "why" for complex logic (race conditions, concurrency, invariants) — not "what" (code is self-documenting)
- **Testing**: Unit tests for utilities, integration tests for queries/actions, e2e for critical flows
- **Security**: No hardcoded secrets; validate inputs via Zod; use `requireSession()` on all data endpoints

## Deployment & Operations

**Environment**

- Vercel: Free Hobby tier, auto-scaling edge functions
- Database: Neon Postgres, SGP region (Scale-to-zero: ~100ms cold start)
- Cron: cron-job.org triggers daily renewal check → Vercel HTTPS endpoint

**Monitoring**

- Cron heartbeat: `cron_state.last_renewal_check_at` — dashboard badge alerts if >25h stale
- Logs: Vercel serverless logs + Neon query insights
- Error tracking: Sentry (optional integration)

**Scaling Notes**

- PWA + edge functions handle burst load
- Neon scale-to-zero may introduce brief cold starts (~100ms)
- CSV export performance untested at >10K rows (defer optimization to live test)
- Web push (VAPID) ready when feature phase adds browser notifications

## Open Questions / Future Phases

- **Phase 2**: Internationalization (English UI, regional locale options)
- **Phase 3+**: Mobile apps (React Native), advanced reporting (PDF export), collaborative features
- Neon cold-start impact on user experience (measure post-deploy)
- CSV export performance at scale (test with >10K rows)
- Web push readiness for browser notifications
