# System Architecture

Personal finance management web PWA. Single-user, Vietnam locale, VND-only, Vietnamese UI (English deferred Phase 2+).

Last updated: 2026-05-23 (research approved).

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

Core entities:

- `users` — single row at MVP; schema supports multi-user later.
- `accounts` — `type` enum: `cash | bank | credit_card | e_wallet | debt`. Balance derived from transactions.
- `categories` — hierarchical, `parent_id` self-FK, seed-list 10 VN-aware buckets.
- `transactions` — `kind` enum: `income | expense | transfer`. `transfer_pair_id` for transfer-linking.
- `recurring_rules` — `rrule` string (RFC 5545), `next_due`, `notified_at`, links to category + account + amount template.
- `budgets` — `category_id`, `period_month`, `amount`, rollover toggle.
- `goals` — `name`, `target_amount`, `target_date`, `current_amount`, `account_id`.

Schema details + migrations: produced by `/ck:plan` → cook phase.

## Module Structure

```
src/
  app/                  # Next.js App Router
    (auth)/             # Sign-in/out routes
    (app)/              # Authed dashboard + features
    api/
      telegram/route.ts # grammY webhook
      cron/             # Cron endpoints
  components/
    ui/                 # shadcn/ui primitives
    forms/              # RHF wrappers
    charts/             # Recharts wrappers
  features/
    transactions/  accounts/  categories/
    budgets/       recurring/ goals/  debts/  reports/
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
