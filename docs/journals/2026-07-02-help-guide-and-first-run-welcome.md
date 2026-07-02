# In-App Help Guide & First-Run Welcome

**Date**: 2026-07-02 19:16
**Severity**: Low (feature enablement, documentation, UX onboarding)
**Component**: Help system, user onboarding, localStorage persistence
**Status**: Complete (committed, ready for push)

## What Happened

Executed plan `260702-1916-user-instructions-help-onboarding`. Built an in-app help guide accessible via `/help` and a first-run welcome dialog that teases the guide on app launch. Both surfaces share a single Vietnamese content module with 11 feature sections (transactions/quick-add with VND parser, accounts, categories, budgets, recurring goals, debts, reports, export, email alerts, PWA install). Welcome dialog persists its "seen" state to localStorage with tri-state logic (null pre-mount, false unseen, true seen) to prevent SSR/CSR hydration flash. Storage logic extracted into pure helpers for vitest testability. All 191 unit tests pass, new e2e specs (2/2) assert auth-gating only. Zero type errors, eslint clean on touched files. Code review: DONE, no Critical/Major findings.

## Technical Details

**Single-Source-of-Truth Content (help-content.ts):**

- Typed array of 11 HelpSection objects: each has `id`, `titleVi`, `descriptionVi`, `tipsVi` (string array).
- WELCOME_TIP_IDS subset (6 teaser IDs) fed to welcome dialog; same exact strings in both surfaces prevent drift.
- Static content; no fetch, no CMS. Changes require code review + redeploy.

**First-Run Persistence (use-welcome-seen.ts):**

- Custom hook: `useWelcomeSeen()` returns `{ seen, markSeen }`.
- Tri-state localStorage value (key `pf.welcome-seen.v1`): `null` (never written), `false` (explicitly hidden), `true` (seen).
- Sync function `readWelcomeSeen()` / `markWelcomeSeen()` for non-hook context (tests, server actions).
- Storage errors fail closed: any exception → treat as `seen=true`, never loop the dialog.

**Components (Shared Sheet Body):**

- `help-section-card.tsx`: reusable card (markdown rendering, copy icons for tips, responsive grid).
- `welcome-dialog.tsx`: Sheet + body from help-section-card, teaser tips from WELCOME_TIP_IDS, "Got it" button calls `markWelcomeSeen()`.
- `WelcomeReopenButton` (in settings) to reopen seen dialog for user testing.

**Routes & Integration:**

- `/help` (new): page.tsx renders full help-content via help-section-card grid, auth-gated (existing middleware).
- Layout.tsx: mounts `<WelcomeDialog/>` at root; usePathname suppresses auto-open on `/help` (avoid stacking teaser over guide user clicked).
- Settings page: "Trợ giúp" row links to /help + WelcomeReopenButton below.

**Tests (100% coverage on new code):**

- `help-content.test.ts`: validates structure, WELCOME_TIP_IDS subset is valid.
- `use-welcome-seen.test.ts`: mocked localStorage, tri-state transitions, error fallback.
- `e2e/help-and-welcome.spec.ts`: /help auth-gating only (no authenticated-user harness in repo; Google OAuth allowlist, no test-backdoor).

## Decisions

**Persistence = localStorage (KISS), Not DB:**

First-run welcome is per-device, not cross-device. Accepted tradeoff: if user clears storage or uses incognito, dialog re-opens. DB-backed cross-device once-only noted as deliberate future cut (scope creep). localStorage is zero-infrastructure, fast, and aligns with MVP.

**Tri-State Seen (null Before Mount):**

Prevents hydration mismatch: SSR renders (no localStorage), CSR mounts and hydrates `seen` from storage, then opens only if `seen===false`. Single source of truth avoids stale boolean state. Null sentinel disambiguates "never written" from "explicitly hidden" (necessary for feature toggling).

**Pure Helpers Over Hook in Tests:**

vitest runs in Node env (no jsdom/RTL). Extracted `readWelcomeSeen()` / `markWelcomeSeen()` as pure functions, mocking `window.localStorage` directly. Avoids adding jsdom/RTL test dependency; keeps test surface small.

**E2e Asserts Auth-Gating Only:**

Repo has no authenticated Playwright harness (Google OAuth allowlist, no test backdoor). E2e validates `/help` returns 401 when unauthenticated, not welcome/full-page interaction. Welcome-once regression risk covered by unit tests (mocking localStorage).

**Auto-Welcome Suppressed on /help:**

First-run user arriving via post-login `?from=%2Fhelp` shouldn't see welcome teaser stacked on the guide they explicitly clicked. Used `usePathname()` to suppress mount on `/help`. Small UX win, prevents double-UI noise.

## Root Cause Analysis

None. Implementation was straightforward:

- Content structure is simple (typed array, no versioning).
- Persistence choice (localStorage) is low-risk for first-run feature.
- Tri-state logic prevents hydration bugs (common Next.js 15 App Router gotcha).
- Pure helper functions make vitest happy without extra test harness deps.

Code review raised zero Critical/Major findings.

## Impact

- Users see welcome dialog on first app launch (one per device).
- `/help` page guides feature by feature, links from settings.
- Single Vietnamese content source prevents future drift between guide + welcome.
- No DB migration, no new npm dependency, all files < 200 LOC.
- Auth gating unchanged; help/welcome sit behind existing middleware.

## Lessons Learned

- **Tri-state for SSR/CSR sync.** null (not yet written) ≠ false (explicitly hidden) ≠ true (seen). Avoids hydration bugs on features touching localStorage.
- **Pure helpers for testability.** Extracting sync functions `readWelcomeSeen()` / `markWelcomeSeen()` let us test storage logic without mocking hook behavior. Worth the 5-line refactor.
- **Single content source, multiple surfaces.** WELCOME_TIP_IDS subset prevents copy drift between welcome teaser and full guide. Caught a potential inconsistency during review.
- **Suppress auto-UI on explicit navigation.** Users clicking "/help" don't want a modal stacked on top. Small usePathname check, big UX payoff.

## Next Steps

- Monitor welcome dialog interaction (opens, dismiss, link clicks) in analytics.
- A/B test: does welcome teaser increase help-page visits? If not, consider auto-open on features (budgets, debts) instead of app launch.
- Gather user feedback: are the 11 sections comprehensive? Anything missing?

---

**Status:** DONE

**Summary:** Built in-app help guide (`/help` page) and first-run welcome dialog sharing a single Vietnamese content module (11 feature sections); localStorage persistence with tri-state logic prevents hydration flash; unit + e2e tests green; code review clean.

**Concerns:** None; typecheck + test:unit (191/191) + new e2e (2/2) + eslint (touched files) all pass.
