# Multi-User Phases 2–4: Open Signup, Provisioning, Cron Fan-out

**Date:** 2026-07-02
**Branch:** `feat/multi-user-open-signup` (stacked on `feat/tx-tenant-isolation-hardening`)

## What shipped

Completed the single-tenant → multi-user migration on top of Phase 1's write-path hardening.

- **Open signup (Phase 2).** Removed the `ALLOWED_EMAIL` allowlist and the `emailVerified` gate. Any Google account signs in and gets an isolated workspace. A slim `user.create.before` hook now enforces only a new `SIGNUP_ENABLED` env flag (optional, default true) — the non-destructive rollback lever: it halts _new_ signups without touching existing users (the hook fires only for new rows). `requireSession` keeps `getSession` as the authoritative server-side check. Deleted `auth-allowlist.ts` + its test; narrowed `UnauthorizedError` to `no-session`.
- **Lazy provisioning (Phase 3).** New users are provisioned on first authenticated app-shell render via `ensure-user-provisioned.ts`, not a Better Auth `create.after` hook. `seed()` now writes the 10 VN categories **and** a default "Tiền mặt" Cash account in one transaction (atomic — no category-without-account soft-lock), guarded on active accounts and idempotent.
- **Cron fan-out (Phase 2).** The daily renewal cron iterates all users with active rules instead of a single owner. Per-user try/catch, aggregated result, SMTP timeouts (7s) so one stalled relay can't burn the 60s budget, and the `cron_state` heartbeat moved out of the runner into the route — written once after the loop, only on a fully-successful run, so a truncated/partial run is re-triggerable the same day.

## Decisions

- **Lazy over `create.after`.** Rather than run the commit-ordering spike the plan called for, went straight to lazy provisioning — it sidesteps the Better Auth transaction-visibility risk entirely (seed's pooled connection can't see an uncommitted user row), so the spike was unnecessary.
- **Kill-switch over allowlist.** `SIGNUP_ENABLED=false` is the rollback lever instead of deleting user rows (cascade FKs make deletion irreversible).
- **Re-provisioning is intentional.** A user who archives _all_ accounts gets a default Cash account re-seeded on next sign-in — the app always keeps a usable default; a fully-empty workspace isn't a supported state. Flagged by code review as a product-intent call; kept as-is.

## Verification

typecheck + build clean; full vitest suite 240/240 (added `seed-provisioning.test.ts`; fixed `renewal-check-idempotent.test.ts` which had been asserting the now-removed runner heartbeat — it was passing _spuriously_ off the singleton row's stale value). Two code-review cosmetics fixed (accurate `account` return on the concurrency-loser path; structured logger in the cron route). e2e not run here (needs a browser + OAuth stub); the specs only reference the allowlist in explanatory comments and test public routes, so nothing breaks.

## Note

Docs update (docs-manager) also corrected long-stale **Telegram → Brevo** references across several docs — the app switched alert channels long ago; the docs hadn't caught up. Accurate, though slightly beyond the multi-user scope.
