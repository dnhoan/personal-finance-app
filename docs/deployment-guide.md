# Deployment Guide

Operational runbook for the Personal Finance App: CI/CD, production deploy,
migrations, cron, rollback, and incident response. Multi-user app on free tiers
(Vercel Hobby + Neon free + cron-job.org).

> **The repo is PUBLIC.** Every CI/preview surface is hardened so a fork PR can
> never reach real financial data. Keep the hardening intact (see §9).

---

## 1. Architecture at a glance

```
GitHub push
  ├── PR branch → CI (lint·typecheck·db:check·unit·build·gitleaks)   ← blocks merge
  │             → Vercel Preview deploy (non-prod DB, stable alias for OAuth)
  └── main      → CI → Vercel Production deploy (auto, on push)

Migrations:  PR → db:check (no DB) + migrate against an empty Postgres container
             prod → manual `Migrate production DB` workflow (workflow_dispatch)

Cron (MVP Phase 9): cron-job.org → /api/cron/renewal-check (disabled until built)
```

- **CI** = GitHub Actions, gates only. It does **not** deploy.
- **CD** = Vercel Git integration. Push to `main` → production; PR → preview.
- **DB** = Neon Postgres (Singapore). Prod branch + a non-prod preview branch.

---

## 2. First-time setup (live accounts — do once)

These steps need your accounts and **cannot be automated by code**. Work top to bottom.

### 2.1 Neon

- [ ] Create the **production** project/branch (Singapore region). Copy its pooled `DATABASE_URL`.
- [ ] Create a **preview** branch (e.g. `preview`) — previews use this, never prod. Copy its URL.
- [ ] Generate a **Neon API key**; note the **project ID** and the **prod branch name** (default `main`).
- [ ] Note the free-tier **PITR retention window** (record it in §6). (CI no longer needs schema-only branches — the migration check uses an empty Postgres container; Neon is only touched by the prod migrate's named snapshot.)

### 2.2 GitHub repo settings

- [ ] **Environments → `production`**: add secrets `PROD_DATABASE_URL`, `NEON_API_KEY`, `NEON_PROJECT_ID`. (No required reviewers — `workflow_dispatch` is the gate.)
- [ ] **Environments → `ci`**: add secrets `NEON_API_KEY`, `NEON_PROJECT_ID` (used by `migration-check.yml`).
- [ ] **Variables**: optionally set `NEON_PROD_BRANCH` (defaults to `main`).
- [ ] **Branch protection on `main`**: require the **`CI / ci`** check. Do NOT require `E2E`.
- [ ] Pin third-party action SHAs (see §9) before treating any check as trusted.

### 2.3 Vercel

- [ ] Create project, import this repo, production branch = `main`.
- [ ] Set the **function region to Singapore in project settings** (not via `vercel.json` — that key is ignored on Hobby). **Verify by observation** (deployment region in the dashboard).
- [ ] Env vars — all 10 from `src/lib/env.ts`:

  | Var                                         | Production                 | Preview                             |
  | ------------------------------------------- | -------------------------- | ----------------------------------- |
  | `DATABASE_URL`                              | prod Neon URL              | **preview branch URL** (never prod) |
  | `BETTER_AUTH_SECRET`                        | real 32+                   | real                                |
  | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | real                       | real                                |
  | `SIGNUP_ENABLED`                            | `true` (optional, default) | `true`                              |
  | `BREVO_SMTP_USER` / `BREVO_SMTP_KEY`        | real                       | real                                |
  | `ALERT_FROM_EMAIL`                          | verified addr              | verified addr                       |
  | `CRON_SECRET`                               | real 32+                   | real 32+                            |
  | `NEXT_PUBLIC_APP_URL`                       | prod URL                   | **stable preview alias URL**        |

### 2.4 Google OAuth + preview alias

- [ ] In Vercel, assign a **stable preview alias** (e.g. `dev.<domain>`). Per-PR preview URLs change every push and cannot support OAuth.
- [ ] In Google Cloud Console, register authorized redirect URIs for **prod** and the **stable alias**:
      `https://<host>/api/auth/callback/google` (confirm path against `src/app/api/auth/[...all]/route.ts`).
- [ ] Set Preview-scope `NEXT_PUBLIC_APP_URL` to the stable alias (Better Auth `baseURL` is build-time pinned — `src/lib/auth.ts`).

### 2.5 First deploy

- [ ] Run `Migrate production DB` once against the empty prod DB to apply the full migration set (§4).
- [ ] Push to `main` (or redeploy); confirm prod boots and sign-in works.
- [ ] Open a test PR; confirm the preview boots and **redirects** unauth routes (sign-in works on the alias, not the ad-hoc URL).

---

## 3. Routine deploy

Vercel auto-deploys on push to `main` — there is no manual deploy step. The only
discipline is **schema changes**, because the deploy goes live before you migrate.

### Code-only change (no migration)

1. Open PR → CI green → merge → Vercel ships. Done.

### Change that adds/alters DB schema — use **expand-contract**

Vercel deploys the new code **before** you can run `Migrate production DB`. If the
new code reads a column that doesn't exist yet, prod 500s. So split it:

- **Add a column (additive):**
  1. PR #1: the migration + code that does **not yet require** the new column (tolerant). Merge → run `Migrate production DB`.
  2. PR #2: code that uses the column. Merge → deploy. The column already exists.
- **NOT NULL / rename / drop:** multi-step — add nullable → backfill → enforce; or add-new → dual-write → drop-old. Never a single migration under live code.

This makes the manual migrate timing safe by construction, not a race.

---

## 4. Migrations

- **Parity (every PR, no DB):** `ci.yml` runs `npm run db:check` — fails if `schema.ts` and the `drizzle/` journal disagree. Catches "edited schema, forgot to generate."
- **Apply-check (migration PRs):** `migration-check.yml` spins an **empty Postgres 16 service container** and runs `npm run db:migrate` against it. Proves migrations apply cleanly on a fresh DB, with zero prod data and no Neon key in the job (stronger than a schema-only branch — nothing sensitive is present to leak).
- **Production apply (manual):** run the **`Migrate production DB`** workflow (`workflow_dispatch`), type `migrate-prod` to confirm. It echoes the masked target host, snapshots a named branch `prod-pre-migrate-<sha>` (durable rollback target), then runs `npm run db:migrate`.
- **Never** `drizzle-kit push` / `db:push` to prod — migrations only.
- **Migration file safety:** keep each file transaction-safe; split risky DDL (NOT NULL adds, index builds, `CREATE TYPE`) into its own re-runnable file so a partial failure isn't wedged.

---

## 5. Cron

The renewal-alert endpoint `/api/cron/renewal-check` is implemented (Phase 11). It fans out over all users with active rules, materialize due recurring transactions, and send email alerts via Brevo.

**Setup:**

- **Authorization:** `POST` with header `Authorization: Bearer <CRON_SECRET>`.
- **Rate Limit:** Per-IP in-memory limit (protected against unauthenticated floods).
- **Idempotency:** Same-day completions are short-circuited (heartbeat only written on a fully successful run; failed users keep the day re-triggerable).

**cron-job.org config:**

- URL `https://<prod>/api/cron/renewal-check`, method `POST`, header `Authorization: Bearer <CRON_SECRET>`.
- Schedule `0 9 * * *` with timezone `Asia/Ho_Chi_Minh` (09:00 ICT daily).
- **Do NOT follow redirects**; treat any non-2xx as failure. Enable failure email to owner.

---

## 6. Rollback

1. **Instant promote (~30s, preferred):** Vercel → Deployments → last-good → **Promote to Production**.
2. **Git revert (~2 min):** `git revert <bad-commit>` → push `main` → Vercel rebuilds the revert.
3. **DB rollback (rare):**
   - Bad **additive** migration → forward-fix with a new migration (the unused column is harmless — this is why expand-contract is mandatory).
   - Data corruption → restore from the named `prod-pre-migrate-<sha>` branch the migrate job created. Do **not** rely on Neon's rolling PITR window (free-tier retention: **\_\_\_ — fill in from §2.1**, may be only hours).
   - **Never** improvise destructive prod SQL.

> Test the rollback for real before you rely on it (§8 task): deploy a trivial visible
> change, Promote the previous deployment, confirm <2 min; then exercise `git revert`.

---

## 7. Secret rotation

| Secret                     | Stored in                       | Rotate then                                           |
| -------------------------- | ------------------------------- | ----------------------------------------------------- |
| `BETTER_AUTH_SECRET`       | Vercel env                      | redeploy (invalidates sessions)                       |
| `CRON_SECRET`              | Vercel env + cron-job.org       | redeploy + update cron-job.org header                 |
| `WEBHOOK_SECRET`           | Vercel env                      | redeploy + update webhook caller                      |
| `PROD_DATABASE_URL`        | GitHub `production` env         | update Vercel `DATABASE_URL` + GitHub secret together |
| `NEON_API_KEY`             | GitHub `ci` + `production` envs | regenerate in Neon, update both envs                  |
| Google OAuth client secret | Vercel env + Google Console     | rotate in Console, update Vercel, redeploy            |

Canonical env list lives in `src/lib/env.ts` — that schema is the source of truth, not this table.

---

## 8. Incident checklist

| Symptom                         | Look here                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Prod 500 right after a merge    | Did a schema change deploy before migrate? → run `Migrate production DB`, or roll back (§6).   |
| Build failing in CI             | `next build` step — likely a new DB page without a dynamic API (see §9 C3).                    |
| Sign-in broken on prod          | Google OAuth redirect URI mismatch; `NEXT_PUBLIC_APP_URL` wrong.                               |
| Sign-in broken on a preview     | Expected on ad-hoc preview URLs — use the stable alias.                                        |
| Cron "succeeding" but no alerts | False-green via the sign-in redirect (§5) — endpoint not built / not excluded from middleware. |
| CI red on an unrelated PR       | Migration check Neon action drift, or gitleaks false positive.                                 |

---

## 9. Known constraints & hardening (do not regress)

- **C1 — `validateEnv()` fail-fast:** runs at module load (`next.config.ts`, `src/lib/env.ts`). Build/dev/test all need the 10 required vars (plus optional `SIGNUP_ENABLED`). CI injects throwaway dummies **at job scope**; do not weaken the fail-fast.
- **C2 — unit tests vs DB:** 7 test files hit a live DB. PR CI runs `test:unit` (the 9 pure-logic files, no DB). DB tests = `test:integration`, run only against a real DB (locally, or a future nightly job with a Postgres service / Neon branch). Keep the split when adding tests.
- **C3 — build-survives rule:** `next build` doesn't connect because every DB page uses a dynamic API (`requireSession()` → `headers()`). **Any new DB-touching page without a dynamic API must add `export const dynamic = 'force-dynamic'`**, or the CI build breaks.
- **C4 — cron middleware exclusion:** The `/api/cron` endpoint is excluded from middleware and protected via `Authorization: Bearer <CRON_SECRET>` (see §5).
- **Public-repo hardening:** the migration check uses an empty Postgres container (no prod data, no Neon key in CI); previews never get the prod DB; gitleaks blocks secrets in YAML. The only job that touches Neon/prod is the manually-dispatched `Migrate production DB`. **Pin all third-party action SHAs** (`neondatabase/create-branch-action`, `gitleaks/*`) before trusting any gate — they are on version tags today for readability.
- **Region:** set in Vercel project settings and verified by observation, not asserted via `vercel.json`.
