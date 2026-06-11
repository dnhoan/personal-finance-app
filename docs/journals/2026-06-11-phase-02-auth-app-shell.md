# Phase 2 Auth & App Shell Completion

**Date**: 2026-06-11
**Severity**: Medium (security boundary)
**Component**: Authentication, app shell
**Status**: Complete (commit `e8a98d8`)

## What Happened

Wired Better Auth (Google-only) with a single-account email allowlist, edge middleware guard, `(auth)`/`(app)` route groups, app shell (top bar + mobile bottom nav), dashboard stub, and the initial Drizzle migration for Better Auth's tables. All runnable acceptance criteria green: typecheck, lint, build (7/7 routes), unit (8), e2e (4 — live middleware redirect + `?from` propagation confirmed). Manual Google-OAuth smoke + `db:migrate` apply deferred (need real creds + reachable Neon).

## Technical Details

- **Better Auth `1.6.16`** — the mandated step-2a spike verified it against live docs. The plan assumed pre-1.0 `1.2.x` ("hooks in flux"); reality is stable post-1.0, so the exact-minor-pin rationale is moot but the pin was kept for reproducibility. Installed `--legacy-peer-deps` (optional `@tanstack/react-start` peer drags in vite 8, unused).
- **Allowlist enforcement lives in `databaseHooks`, not request middleware.** Spike gotcha: for Google OAuth the email is absent from `ctx.body` at `/sign-in/social` (it only arrives at Google's callback), so a `hooks.before` request guard has nothing to gate on.
- **Two hooks, by design:** `user.create.before` (first sign-in) + `session.create.before` (every returning sign-in). Both call the pure `assertAllowlisted()` and throw `APIError(FORBIDDEN)`.
- `src/lib/auth-allowlist.ts` is **dependency-free** (no env, no db) → hermetic Vitest unit test, single source of truth shared by both hooks and `requireSession()`.
- `requireSession()` (`src/lib/auth-session.ts`) is `server-only` + React-`cache`d — dedupes the `getSession` DB hit across `(app)/layout.tsx` and `dashboard/page.tsx` in one render; re-runs the allowlist per call.
- Middleware (`src/middleware.ts`) is edge cookie-presence only via `getSessionCookie` — no Drizzle. Benign build warning: jose's `DecompressionStream` is bundled but never invoked on the cookie-presence path.

## Root Cause Analysis

N/A — successful delivery. One code-review finding addressed pre-merge (below).

## Decision Points

1. **Forced scope deviation — Better Auth's 4 tables landed in Phase 2.** The plan deferred _all_ schema to Phase 3, but the Drizzle adapter cannot function without `user`/`session`/`account`/`verification`. Confirmed with user; hand-wrote `src/lib/db/auth-schema.ts` (re-exported from `schema.ts`), generated `drizzle/0000_serious_luckman.sql`. Domain tables remain Phase 3.
2. **Code-review H1 → fixed at source.** Reviewer found a returning/env-rotated disallowed user could still get a real session minted (`user.create.before` doesn't re-fire for an existing row). This mapped directly to the plan's own §Security line "allowlist check on EVERY sign-in (not just first)" — a requirement the single-hook design under-implemented. Closed by adding `session.create.before`. Not scope creep; spec compliance.
3. **M1 redirect hardening** — `from` guard now rejects `//evil` and `/\evil` (backstopped already by Better Auth's patched callback validation, but cheap defense-in-depth).
4. **Phase 10 forward-dep avoided** — sign-out cache purge inlined as a guarded best-effort `caches` clear in `auth-client.ts` (no-op until the SW exists); did not create Phase 10's `pwa.ts`.

## Risk & Notes

- **Live Neon connection string was committed** in `.env.example` — scrubbed to placeholder. **The password is in git history → must be rotated.**
- **`db:migrate` not yet applied** — run against Neon before first real sign-in.
- **Google OAuth redirect URI** for the console: `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google`.
- **Hard rule for Phase 3+:** every Server Action / Route Handler that touches data MUST call `requireSession()` first — middleware does not cover Server Functions.

## Lessons Learned

The plan's "verify the exact hook before coding" spike paid off — the obvious request-middleware approach was a dead end for OAuth, and the plan's own §Security line ("every sign-in") was the spec that justified the second hook the reviewer flagged. Extracting the allowlist as a pure function made the security-critical logic trivially testable without a DB or env.

## Next Steps

Phase 3 (DB Schema & Seeds): domain tables (`accounts`, `categories`, `transactions`, `recurring_rules`, `budgets`, `goals`) FK'd to Better Auth's `user.id`; seed the 10 VN category buckets.

## Unresolved Questions

- Is post-Phase-2 rotation of `ALLOWED_EMAIL` a real operational scenario? If never rotated and no second Google account ever touches the app, H1's residual risk was near-zero — but the `session.create.before` hook makes the boundary provably correct regardless, so it stays.
