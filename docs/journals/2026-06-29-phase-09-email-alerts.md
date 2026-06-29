# Phase 9 — Email Alerts (Brevo SMTP + cron)

**Date:** 2026-06-29
**Scope:** Daily renewal-alert emails via an external cron hitting a secret-guarded endpoint. Replaces the never-implemented Telegram design.

## What shipped

- `lib/mailer.ts` — Nodemailer over Brevo SMTP relay (`smtp-relay.brevo.com:587`, STARTTLS), `sendMail({subject,html})`, `MailError`.
- `lib/html-escape.ts` — `escapeHtml` for `&`/`<`/`>`.
- `server/auth/verify-cron-secret.ts` — bearer-missing short-circuit → SHA-256 both sides → `timingSafeEqual` (equal-length, no length oracle).
- `server/cron/rate-limit.ts` — in-memory 10 req/min/IP token bucket (defense-in-depth; the secret is the real guard).
- `server/cron/lib/format-renewal-message.ts` — pure `{subject,html}`; escapes the user note in both; `DD/MM/YYYY` via string-split.
- `server/cron/run-renewal-check.ts` — materialise-first, per-active-rule due detection, claim-before-send, per-rule catch, heartbeat UPSERT.
- `app/api/cron/renewal-check/route.ts` — `runtime=nodejs`, `maxDuration=60`, auth → rate-limit → owner-by-`ALLOWED_EMAIL` → run.
- `settings/email-alerts` page + settings row; README Brevo + cron-job.org docs.
- Env swap Telegram→Brevo across `env.ts`, `.env.example`, both CI workflows, local `.env.local`.

## Two decisions that mattered

**1. Due detection recomputes from the rrule — never the stored `next_due`.**
The plan keyed the alert query on `next_due BETWEEN today AND today+leadDays`. But `materialiseDueInstances` (run first, defensively) advances `next_due` to the first occurrence _after_ the 30-day lead window — always ≥30 days out — so that query would never match a bill due in 3 days. The dashboard already hit and solved this exact trap (`recurring/queries.ts` recomputes due-soon from the rrule). The cron now does the same: `nextOccurrences(rrule, 1, now)`, alert if within `leadDays`. Idempotency (`notified_at` date-key + UPDATE-before-send) is independent of this and unchanged.

**Lesson:** a field-name validation pass ("does `next_due` exist?") doesn't catch a _dynamic_ contract — what the value _is_ at the moment the consumer reads it. The cursor is correct for materialisation and wrong for alerting; only running the two steps in sequence reveals the conflict.

**2. The middleware silently ate the cron POST (caught in code review, invisible to tests).**
`middleware.ts`'s cookie-presence guard matcher didn't exclude `/api/cron`. cron-job.org sends no session cookie, so the POST would 302 to `/sign-in` before `verifyCronSecret` ever ran — the endpoint was unreachable in production, and _every gate passed_ because no test issues an HTTP request through the Next middleware stack (the idempotency test calls `runRenewalCheck()` directly; the auth test calls `verifyCronSecret()` directly). Fixed the matcher and added `middleware-excludes-cron.test.ts` asserting the regex against the cron path so it can't regress. `docs/system-architecture.md` already described the intended (secret-only, cookieless) behavior — code had drifted from doc.

**Lesson:** unit-testing the handler and the guard function in isolation leaves the _composition_ (middleware → handler) untested. The one bug that shipped lived precisely in that seam.

## Verification

typecheck · lint · build · 162 unit tests · 1 live-Neon integration test (fires once across two same-day runs, `notified_at=today`, heartbeat bumps both runs) — all green. Remaining: post-deploy curl smoke + cron-job.org config (needs a live deploy).
