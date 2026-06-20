# CI/CD Pipeline & Production Deployment Infra

**Date**: 2026-06-20
**Severity**: Medium (infra; public-repo attack surface, prod-migration safety)
**Component**: GitHub Actions, Vercel config, Neon migrations, deploy runbook
**Status**: Code-complete — PR [#4](https://github.com/dnhoan/personal-finance-app/pull/4) green on `ci-cd-and-production-deployment`; live-account setup pending (runbook §2)

## What Happened

Built the infrastructure layer: GitHub Actions CI gates, Vercel Git-integration
deploy config, gated Neon production migrations, and an operational runbook
(`docs/deployment-guide.md`). Plan was red-teamed (4 reviewers, 14 findings) and
the implementation code-reviewed (8/10) before commit. Shipped: `ci.yml`,
`e2e.yml`, `migration-check.yml`, `migrate-prod.yml`, `vercel.json`, `.npmrc`,
`.gitleaks.toml`, `package.json`/`eslint.config.mjs`/`playwright.config.ts` edits.

## Key Decisions

- **Public repo → harden, not privatise.** The repo is public, so the plan's
  original "private, fork exposure moot" assumption was wrong. CI/migration jobs
  avoid prod data entirely (see below); previews never get the prod DB; gitleaks
  guards against credential leaks.
- **`test:unit` / `test:integration` split.** 7 of 16 test files open a real DB
  pool at import (`src/lib/db/client.ts`). The PR gate runs only the 9 pure-logic
  files (no DB, fork-safe, 98 tests). DB-coupled tests are integration-only.
- **`migrate-prod`: `workflow_dispatch`, no self-approval.** Manual dispatch is
  the "deliberate, not automatic" property; a required-reviewer gate where
  reviewer==requester is rubber-stamp ceremony, so it was dropped. Secret scoped
  to the `production` environment; named pre-migrate Neon snapshot as the rollback
  target (free-tier PITR retention is unreliable).
- **Expand-contract is mandatory for schema changes.** Vercel auto-deploys on
  push before the manual migrate can run; column-tolerant code must ship first.

## What Went Wrong / Surprises

The instructive part. Everything passed locally, then **CI failed three times** on
a clean runner for reasons local state masked:

1. **`create-branch-action@v5` silently ignores `schema_only`** (caught in code
   review against the action's manifest). The planned "schema-only Neon branch"
   would have pulled _full prod financial data_ into a public-repo CI job.
   Replaced with an **empty Postgres 16 service container** seeded from
   `drizzle/` migrations — no prod data, no Neon key on the PR path. Strictly
   stronger and simpler than the original design.
2. **`npm ci` failed on a fresh install** — `better-auth` peerOptional ranges
   (`drizzle-kit >=0.31.4`, `drizzle-orm ^0.45.2`) conflict with the pinned
   0.30/0.36 lines. Local `node_modules` already existed so I never saw it.
   Fixed with `.npmrc` `legacy-peer-deps=true` (the lockfile was already resolved
   that way) — deterministic across local, CI, and the pre-commit hook.
3. **gitleaks false-positives twice.** First, `gitleaks-action@v2`'s PR-range scan
   exits non-zero on partial-scan edge cases even with zero leaks → switched to the
   CLI on the working tree. Then `detect --no-git` flagged `.next/`
   `prerender-manifest.json` encryption keys (build output) as `generic-api-key`
   → moved the scan **before** the build and added `.gitleaks.toml` excluding
   `.next/`, `node_modules/`, `.claude/`. Also reshaped the dummy `BOT_TOKEN`,
   which matched gitleaks' Telegram-token pattern.

## Lessons

- **"Passes locally" ≠ "passes on a clean runner."** Pre-existing `node_modules`,
  a populated `.next/`, and a working dotenv hid three real failures. Opening the
  PR as a live smoke test of the gates surfaced all of them — worth the iterations.
- **Scope scanners to source, not vendored/generated paths.** Both ESLint and
  gitleaks needed `.claude/` (and `.next/`) excluded — the same lesson twice.
- **Verify external action contracts against their manifests**, not their READMEs
  — the `schema_only` no-op was invisible until checked directly.

## Follow-ups (handoff)

- Live-account setup (runbook §2): Vercel project, Neon prod/preview branches, 11
  env vars, GitHub Secrets/Environments, Google OAuth + stable preview alias.
- cron-job.org stays disabled until MVP Phase 9 ships `/api/cron/renewal-check`
  (and adds `api/cron` to the middleware matcher exclusion — else false-green).
- Pin third-party action SHAs (`neondatabase/*`) and bump the Node-20 actions
  before treating gates as fully trusted.
