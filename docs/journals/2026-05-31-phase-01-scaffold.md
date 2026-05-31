# Phase 1 Scaffold Completion

**Date**: 2026-05-31
**Severity**: Low
**Component**: Project foundation
**Status**: Complete

## What Happened

Initialized empty repo → fully scaffolded, runnable Next.js 15 + TypeScript strict + Tailwind v4 + Drizzle/Neon + shadcn/ui + Vitest + Playwright + Husky. All 11 acceptance criteria met: typechecking, linting, build pass; env validation fails fast with Zod listing 11 required vars; drizzle-kit introspects schema (correctly empty at this phase); tests pass (1 e2e, 1 unit).

## Technical Details

- Drizzle uses `neon-serverless` WebSocket pool (preserves `db.transaction` for Phase 4); **not** `neon-http`.
- Env validation eager-exported from `src/lib/env.ts:37`, runs at module load via `next.config.ts:4`.
- Tailwind v4 CSS-first (`@theme` in globals.css, no `tailwind.config.ts`).
- Fonts: `next/font` + Vietnamese subset (Plus Jakarta Sans + Fraunces).
- Husky pre-commit chains lint-staged → full-project typecheck (slowness trade-off accepted; tsc-only-changed infeasible).
- `preferredRegion = ['sin1']` in `src/app/page.tsx` as template for future routes (red-team F14).

## Root Cause Analysis

N/A — successful delivery.

## Decision Points

1. Skipped `create-next-app` template (pre-existing CLAUDE.md + docs + plans would conflict). Manually wrote all configs for full control, same end state.
2. Drizzle config uses raw `process.env.DATABASE_URL!` (not validateEnv) — dev-tool-only concern; dotenv covers it. Code-reviewer flagged minor inconsistency; accepted.
3. Husky full-project typecheck rather than staged-only — no viable tsc plugin exists; cost outweighed by safety.

## Risk & Notes

- Edge-runtime bundling: `src/lib/db/client.ts` imports Node-only `ws`/Pool. If future route opts into edge + transitively imports `@/lib/env`, bundling needs care (Phase 4 boundary check).
- `release-manifest.json` (338KB, pre-existing) left untracked. Verify with user if should be committed.

## Lessons Learned

Manual config > template when docs/plans pre-exist. Full typecheck trade-off is justified for single-dev project (catch errors early, shallow learning curve).

## Next Steps

Phase 2 (Auth & App Shell): Google OAuth integration, user schema, allowlist gate, dashboard layout.

## Unresolved Questions

- Should `release-manifest.json` be .gitignored?
