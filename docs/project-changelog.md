# Project Changelog

## Transaction Tenant-Isolation Hardening (2026-07-02)

### Security

- **Ownership guards on transaction writes.** `createTransaction`, `updateTransaction`, and
  `createTransfer` now verify the client-supplied `accountId`/`categoryId` (and both transfer
  legs) belong to the requester before writing, via a new
  `features/transactions/lib/assert-tx-refs-owned.ts` (mirrors the existing recurring-rule
  ownership guard). Previously these referenced accounts/categories by id alone; combined with
  the `ON DELETE RESTRICT` FK on `account_id`, a caller could attach a row to another account —
  a latent cross-tenant write hole that opening signup would activate.
- **Per-user idempotency key.** `transactions_client_op_id_uniq` widened from `(client_op_id)`
  to `(user_id, client_op_id) WHERE client_op_id IS NOT NULL` (migration `0005`), so one user's
  `clientOpId` can no longer collide with another's and suppress a write. Both
  `onConflictDoNothing` sites (`insertTxIdempotent`, `insertTransferAtomic`) updated to match.
- Added `tests/features/transactions/cross-tenant-isolation.test.ts` (rejection of foreign
  account/category/transfer legs; per-user `clientOpId` namespacing).
- Defense-in-depth for the current single-user app; first phase of the multi-user migration.

## Dedicated /add Capture Page with Numeric Keypad (2026-07-01)

### Changed

- **New add-transaction surface.** Replaced the bottom-sheet quick-add with a dedicated
  full-screen `/add` route optimized for fastest entry: amount-first with a custom in-app
  numeric keypad (no OS keyboard), pre-filled context (default account + per-kind default
  category), and a compact context block for account/category/goal/date/note.
- **Optimistic save (no wait).** Save writes in a `startTransition`, clears the amount for
  the next entry immediately, and toasts success. A failed write shows a "Thử lại" toast
  that re-submits the same payload with the same `clientOpId` (server idempotent → no
  double-post). Stay-on-page enables rapid multi-entry; the header ✕ returns.
- **Global add entry point.** The mobile bottom nav gains a docked center ＋ button
  (2 tabs · ＋ · 2 tabs) linking to `/add`; desktop keeps a corner FAB. Both are hidden on
  `/add`. Per-page `QuickAddLauncher` mounts removed from dashboard + transactions.
- **Account-detail quick-add dropped.** The account hero's Add/Transfer pills + embedded
  sheet were removed; adds now go through the global button. Rename stays in the overflow menu.
- **Removed components:** `quick-add-sheet.tsx`, `quick-add-launcher.tsx`,
  `quick-add-amount-field.tsx`. Shared form helpers extracted to
  `features/transactions/lib/quick-add-form.ts`; keypad logic is a pure, unit-tested reducer
  (`features/transactions/lib/amount-keypad-reducer.ts`).

## Remove JSON Full-Backup Export (2026-07-01)

### Changed

- Removed the JSON full-backup download (`GET /api/export/json`) and its Settings entry
  ("Sao lưu toàn bộ" / all-data JSON). Route handler, `buildJsonBundle` helper
  (`src/features/export/lib/json-bundle.ts`), and the JSON endpoint e2e gating test deleted.
- CSV transactions export (`GET /api/export/csv?entity=transactions`) is unchanged and remains
  the only data-export surface.

## Default Account & Category on Quick-Add (2026-06-30)

### Features Shipped

**Default account** — User-marked default account, DB-persisted (cross-device)

- Schema: `accounts.is_default boolean` + partial unique index `accounts_user_default_uniq`
  (`UNIQUE (user_id) WHERE is_default`) — at most one default per user, DB-enforced
- `setDefaultAccount` action: clear-then-set in one transaction; validates the target is the
  user's and active before clearing the prior default (archived/unknown id rejected outright,
  so the user is never left without a default)
- `archiveAccount` now clears `is_default` (an archived account can't stay the default)
- Settings/accounts: "Đặt làm mặc định" overflow item (hidden when already default or archived)
  - "Mặc định" badge on the default row
- `getDefaultAccountId` query + `is_default` surfaced on `AccountWithBalance`

**Default category** — Derived from a user-controlled category order, DB-persisted

- Schema: `categories.sort_order integer` (+ `categories_user_kind_order_idx`); backfilled from
  the prior alphabetical order so existing categories keep a stable initial order
- `reorderCategories({ kind, parentId, orderedIds })` action: full-order write per sibling
  scope, ownership + scope + length validated (a stale/cross-scope list is rejected, not applied)
- `listCategoriesFlat` now orders by `(sort_order, name)` — drives both the picker and the
  settings tree display; `getDefaultCategoryIds` returns the first root per kind
- `createCategory` appends new items via `MAX(sort_order)+1` within their scope
- Settings/categories: drag-and-drop reordering (`@dnd-kit`) within each sibling group
  (roots; a root's children), pointer + keyboard sensors, vertical-axis restriction,
  optimistic reorder reverting on server reject; cross-parent / cross-kind drags prevented

**Quick-add pre-fill** — Opens pre-selected instead of empty

- Account: page-level resolver — explicit default → single active account fallback → none
- Category: first-ordered category for the current kind, re-seeded on income↔expense switch
  (transfer ignores category); the "Không có danh mục" option remains
- Dashboard, transactions, and account-detail surfaces resolve and pass the defaults;
  account-detail still pins its own account as the "from" account

**Behavior change**: quick-add now pre-fills a category where it previously defaulted to none.

**Migration**: `drizzle/0004_round_nightcrawler.sql`. **New dep**: `@dnd-kit/core|sortable|modifiers`.
**Tests**: `resolveDefaultAccountId` (unit), `default-account` + `category-order` (integration).

## Phase 10: PWA Export & Polish (2026-06-30)

### Features Shipped

**Progressive Web App (PWA) Layer** — Offline-capable installable app via Serwist 9

- Service Worker (`src/sw/index.ts`): explicit runtime caching strategy
  - NetworkOnly for authenticated routes `(app)/*` + `/api/*` (always fresh, cookie-bearing)
  - CacheFirst for static assets (versioned, persistent across updates)
  - NetworkFirst (3s timeout) for HTML navigations with `/offline` fallback
  - Versioned cache name `finance-v${BUILD_ID}` (git short SHA injected via `next.config.ts` withSerwist wrap; SW disabled in dev)
- Installation manifest: `public/manifest.json` (theme_color #FAF8F5, standalone mode, start_url /dashboard)
  - Icon set: 192×192 (rounded), 512×512, 512×512 maskable for adaptive Android home screen
- Offline fallback page (`public/offline`) — top-level, unauthenticated, calm messaging
- Auth sync: `auth-client.ts` purges all `finance-*` caches on sign-out; LOGOUT message handler
- Update available: toast notification on `controllerchange` event (user-triggered refresh)
- Middleware updated to keep SW assets public: `sw.js`, `manifest.json`, icon files, `/offline` route

**Data Export** — User-initiated backup & analysis downloads

- `GET /api/export/csv?entity=transactions` — Streaming CSV export
  - UTF-8 BOM for Excel VN display
  - VN locale dates: ICT dd/MM/yyyy format
  - Formula-injection neutralisation per cell (RFC-4180 quoting)
  - Utility: `src/lib/csv-escape.ts` (strip leading `=`, `+`, `@`, `-`)
- `GET /api/export/json` — Full per-user backup bundle
  - All entities (accounts, categories, transactions, budgets, goals, debts, recurring rules)
  - User-scoped: `user_id` filter + excludes auth tables (user, session, account, verification)
  - Cache-Control: no-store (no intermediate caching)
- Both endpoints require session (`requireSession()`) + return `Content-Disposition: attachment` headers
- Settings page: export download links (CSV transactions, JSON backup)

**Polish & Accessibility** — Production refinements

- EmptyState component on accounts list (first-run CTA)
- Per-route error boundaries via `error.tsx` (8 feature routes)
  - Shared `RouteError` component for consistent error UX
  - Graceful fallback on unexpected throws
- Accessibility audit via axe-core in e2e suite
  - Found + fixed real WCAG AA contrast failure on subtle text
  - Darkened `--color-fg-subtle`: light #8e8b87→#6f6c68, dark #74726e→#8a8884
  - Verified all touch targets ≥44×44 px

### Tests

- `tests/lib/csv-injection.test.ts` — 13 unit tests (formula escape coverage)
- `e2e/pwa-install-manifest.spec.ts` — Manifest presence + icon resolution
- `e2e/a11y-axe.spec.ts` — Automated WCAG AA scan across routes
- `e2e/sign-in-add-export.spec.ts` — Export endpoint auth + CSV structure validation

### Validation

- TypeCheck + lint: ✅ clean
- Build: ✅ 18 routes; SW 38 KB; cache-name versioning verified
- Tests: ✅ 177 unit + 15 e2e pass
- Code review: ✅ 0 Critical/High/Medium issues

### Notes

- PWA installed on Android auto-adds to home screen (Add to Home Screen); iOS uses Share → Add to Home Screen
- Serwist v9 migration from next-pwa complete; no workbox dependency
- CSV export: safe for import to Excel, Sheets, Numbers (formula injection handled)
- Post-deploy: manual Lighthouse run, on-device install test (Android + iOS), live Vietnam latency ping from hosted URL

---

## Phase 8: Reports & Dashboard (2026-06-27)

### Features Shipped

**Analytics & Reporting Suite** — Multi-view financial insights with time-range controls

- Query module `src/features/reports/queries.ts`: `netCashFlowMtd`, `netWorthSnapshot`, `topCategoriesThisMonth`, `upcomingRenewals`, `cashFlowSeries`, `cronHeartbeat` — all user-scoped, month bucketing via stored-generated `occurred_month_ict` column
- Spending breakdown: `spending-by-category-query.ts` — donut visualization with one-level drill + 8-slice "Khác" (Other) cap
- Time-range presets: `lib/range-presets.ts` (mtd/last-month/last-3m/last-12m/custom) with 24-month DoS protection
- Chart components: hero-net-cash-flow, net-worth-card, top-categories-card, upcoming-renewals-card, cash-flow-chart (Recharts ComposedChart), spending-donut (Recharts + URL-state drill), range-picker, report-tabs
- WCAG chart fallback: `chart-data-table.tsx` (sr-only table for screen readers)
- Theming: `chart-theme.ts` (CSS-var tokens + reduced-motion support) — dark mode auto-flips via `:root` variables

**Dashboard Redesign** — Centralized financial overview with cron health monitoring

- Hero section: net cash flow MTD (transfers excluded), Fraunces 40 weight
- Card layout: net worth + top categories + upcoming renewals + cron health badge
- Recent transactions list retained; QuickAddLauncher preserved
- All queries run in parallel via `Promise.all`
- Net worth reuses Phase 7 `listAccountsWithBalance` + `groupAccounts` (correct debt/receivable signs)

**Cron Health Monitoring** — Renewal alert staleness detection

- `src/features/dashboard/lib/cron-health.ts`: staleness check (red warning if >25h since last renewal check)
- `cron-status-badge.tsx`: visual heartbeat indicator on dashboard

**New Routes**

- `/reports/cash-flow` — composited income vs. expense over time
- `/reports/spending` — category drill-down donut + historical trends
- `/reports/net-worth` — net worth snapshot with account breakdown

### Dependencies

- Added: `recharts@^3.9.0`

### Validation

- TypeCheck + lint: ✅ clean
- Build: ✅ 18 routes
- Tests: ✅ 14 unit + 5 live-Neon integration green

### Notes

- Charts auto-theme via CSS variables — no manual dark mode handling required
- Range presets include DoS cap to prevent expensive queries on large date spans
- Spending drill-down persists via URL state for shareable reports

---

## Phase 8: Dashboard & Reports UI/UX Improvements (2026-06-29)

### Features Shipped

**Report Polish & Loading States** — Smooth data fetch UX with skeletons and empty states

- Loading skeletons: `loading.tsx` on dashboard + all three report pages; `skeleton.tsx` primitive for consistent visual
- Empty states: shared `empty-state.tsx` component with calm message + CTA to Accounts setup (first-run experience)
- Report page structure: `report-page-header.tsx` with page title + human-readable range label (via `formatRangeLabel()`)

**Month-Over-Month Deltas** — Insight layer for spending and cash flow

- New helper `src/features/reports/lib/delta.ts`: `computeDelta(current, previous)` for MoM calculations with income/expense coloring
- Updated queries: `netCashFlowMoM()` returns current MTD + previous full month; `spendingTotalForRange()` supports custom range delta
- Dashboard hero + hero-net-cash-flow card now display income/expense MoM delta with color coding
- Spending report: MoM delta on the donut breakdown
- Cash-flow report: MoM delta on the main chart

**Net-Worth Trend** — Historical net worth via derived-on-read architecture

- New query `src/features/reports/net-worth-trend-query.ts`: `netWorthTrend(userId, months)` computed purely on read from transaction history via single windowed SQL query (no snapshot table, no migration, no backfill). Current-month output verified equal to `netWorthSnapshot().net` for sign convention consistency.
- Dashboard net-worth card: mini inline sparkline + MoM delta showing current vs previous month
- Net-worth report: 12-month area chart with sr-only data table; reuses `chart-theme` + reduced-motion support
- Known limitation: accounts use current status/existence across entire window (single-user scale acceptable)

**Range Presets Enhancements** (`lib/range-presets.ts`)

- `formatRangeLabel()` — Human-readable range description (e.g. "Jun 1–Jun 29, 2026")
- `previousRange()` — Resolve preceding equivalent period for delta calculation (MTD → last month, etc.)
- Exported `MAX_MONTHS_BACK` constant (24 months) — enforced DoS protection + hard cap for trend queries

**Shared Report Primitives** (`src/features/reports/components/`)

- `stat-delta.tsx` — Month-over-month delta display with semantic coloring (income green, expense red)
- `section-title.tsx` — Consistent report section heading styling
- `empty-state.tsx` — First-run CTA to account setup
- `skeleton.tsx` — Loading placeholder matching final content height/width
- `report-page-header.tsx` — Page title + resolved range label

### Tests

- Added: `tests/reports/net-worth-trend-query.test.ts` — verifies current-month trend output equals `netWorthSnapshot()` net
- All: ✅ typecheck, lint, build pass; 14 unit + 5 live-Neon integration tests green

### Notes

- Derived-on-read net-worth trend: zero drift risk, no schema maintenance, single round-trip query. Validation decision from plan session.
- MoM delta basis: MTD vs full previous month (early-month caveat noted in UX copy)
- All charts retain sr-only `ChartDataTable` equivalents for WCAG accessibility parity

---

## Phase 8: UI/UX Chrome & Navigation (2026-06-27)

### Features Shipped

**Global Theming & Chrome** — System-aware dark mode + accessibility baseline

- Next viewport export with per-scheme `themeColor` (light/dark)
- `color-scheme: light dark` on `:root` + `@media (prefers-color-scheme: dark)` auto-activates `.dark` tokens
- No toggle UI — system preference only
- Heading `text-wrap: balance` for better readability
- Skip-to-content link + `<main id>` for keyboard nav

**Focus/Hover/Touch States** — Full interactive feedback coverage

- Focus-visible rings on all focusable elements
- Hover feedback on buttons, selects, FAB, bottom-nav, filter pills
- Touch targets: `touch-manipulation` + `-webkit-tap-highlight` suppressed
- Select item highlight via `data-[highlighted]` attribute

**Optimistic Delete & Archive** — Improved UX for destructive actions

- Transaction delete: 5s undo toast (via `sonner`), reverted if page unmounts during grace period
- Account archive: immediate toast + `unarchiveAccount` server action for undo
- Single `<Toaster>` in (app) layout; `window.confirm` removed

**Forms Polish** — Validation & input hygiene

- Focus-on-validation-error for better error discovery
- `spellCheck={false}` on numeric/identifier inputs
- Ellipsis placeholders for improved placeholder hints
- Dirty-state discard guard on quick-add & account-form sheets

**List Performance** — Rendering optimization for long transaction lists

- `content-visibility: auto` + `contain-intrinsic-size` on transaction rows
- `overscroll-contain` on sheet body and filter scroller

**Navigation Redesign** — TopBar removal + Settings restructure

- Removed global TopBar component (`top-bar.tsx`, `sign-out-menu-item.tsx` deleted)
- Settings page redesigned: grouped account/appearance/help sections with account header + Sign Out footer
- New `SignOutButton` + `SettingsRow` components for consistent Settings layout
- Account email + Sign Out migrated from TopBar → Settings footer

### UI Updates

- Applied accessibility baseline to all pages
- Transaction delete flows use optimistic undo instead of confirmation dialogs
- Settings navigation consolidated into single grouped layout
- Dark mode automatically enabled on `prefers-color-scheme: dark`

### Tests

- All existing tests pass; no new test files added (refactor + polish scope)
- TypeCheck, lint, build: ✅ clean

### Notes

- Design tokens (colors, spacing, radius, type) unchanged — only chrome/interaction layer updated
- No schema or server-side changes; purely frontend polish
- Sonner toast library now a hard dependency for undo feedback

---

## Phase 7: Goals & Debts (2026-06-20)

### Features Shipped

**Goals** — Virtual savings buckets within accounts

- CRUD actions: `createGoal`, `updateGoal`, `archiveGoal`
- Read queries: `getGoalProgress`, `listGoalsWithProgress`, `listActiveGoals`
- Zod validation in `schemas.ts`
- UI components: goal-list, goal-row (with SVG progress ring), goal-form-sheet, goal-picker
- Page: `/goals`
- Progress computed at read time: `SUM(transactions.amount) WHERE goal_id=$g AND user_id=$u` — no denormalised cache
- Transactions tagged to goals manually via quick-add sheet (income/expense only; transfers omitted)
- `createTransaction` validates goal ownership before linking

**Debts & Receivables** — Liability and asset accounts

- Debt accounts track money owed (paid down with expense transactions)
- Receivable accounts track money owed to you (collected with income transactions)
- Status computed from balance: `debtStatus(remaining, initial)` → open/partial/settled
- Queries: `listDebtsWithBalance` (direction-aware)
- UI components: debt-list (active/settled/all segment filter), debt-row
- Page: `/debts`
- Pure utility: `lib/debt-status.ts` — `debtStatus()`, `debtPaidRatio()`

### Schema Changes

- **enum `account_type`** gained `receivable` (asset, owed to you)
- **balance convention** (debt/receivable):
  - Debt/receivable balance = `initial_balance − settled`
  - Counts down to 0 as obligation clears
  - Feeding net worth: `groupAccounts()` subtracts debt balances (as liabilities), counts receivables as assets
  - Spending accounts keep original signed-sum formula
- **index** `transactions(goal_id, user_id)` for goal-progress queries
- **migration 0003:** Added `receivable` enum value; created goal/user index

### UI Updates

- Settings ("More") page gained Goals + Debts nav rows
- Transaction revalidation now also revalidates `/goals` and `/debts` paths

### Tests

- `tests/debts/debt-status.test.ts` — 11 unit cases
- `tests/features/goals/progress-query.test.ts` — 3 integration cases
- `tests/debts/account-balance.test.ts` — 2 integration cases
- All tests: ✅ green (110 unit + 25 integration); typecheck, lint, build pass

### Notes

- Test infrastructure: added `tests/stubs/server-only.ts` + vitest alias for importing server-only query modules in integration tests
- No stored `status` field on debt/receivable accounts — computed purely from balance at read time (back-dating and deletes always re-derive correctly)
- Goal progress includes all transaction kinds (income, expense, transfers with a goal tag) — design choice: "manual marking" model

---

## Previous Phases

- **Phase 1–6** — See `plans/` directory for archived phase documentation.
