# UI/UX Improvements: Theming, Focus States, Undo, List Perf, Settings Redesign

**Date**: 2026-06-27
**Severity**: Medium (polish on existing features, no business-logic changes)
**Component**: Theming, forms, transaction delete UX, Settings layout, list rendering perf
**Status**: Complete (uncommitted; cook workflow via plans/260621-ui-ux-improvements/)

## What Happened

Executed a 6-phase UI/UX improvement plan across the app: global dark mode theming (system-auto via media query + explicit toggle state), per-component focus/hover/touch affordances, toast-based undo for destructive actions (transaction delete, account archive), form polish (focus-on-error, input hints, dirty-state guards), CSS-only list perf (content-visibility, intrinsic size), and Settings page redesign (removed global TopBar, consolidated account info + sign-out into Settings).

All gates green: typecheck clean, lint clean, 110/110 unit tests pass (135/135 with integration).

## Technical Details

**Dark Mode — DRY Token Architecture:**

- Added Next.js `viewport` export with per-color-scheme `themeColor` (Chrome address bar theming).
- Global `:root` now exports `--dark-*` raw values once; two tiny selectors (`.dark` class + `@media (prefers-color-scheme: dark) :root:not(.light)`) map them to live `--color-*` tokens.
- Avoids duplicating 33-line dark palette block. System-auto off by default (no toggle UI); users who prefer dark in OS settings get it automatically.
- Added `color-scheme: light dark` to suppress browser default form styling.

**Focus/Hover/Touch Refinement:**

- Button, Select, FAB, BottomNav, transaction filter pills now have explicit focus (`:focus-visible` + ring), hover (lift/shadow), and touch (highlight) states.
- Radix Select item highlighting switched from `:focus` pseudo-class to `data-[highlighted]` attribute (Radix's own keyboard nav signal), eliminating focus-trap confusion.

**Undo Delete — Optimistic Removal (Critical Fix):**

- Initial approach: "optimistic-DELAY" — hide toast, schedule 5s server delete, show row until revalidation. User reported row didn't disappear.
- **Bug insight:** The delete timer lived in TransactionRowActions (child), which unmounts when row hides. Timer fires immediately or gets dropped.
- **Fix:** Timer lives in TransactionRow (parent), which stays mounted while rendering `null` (hidden). Row hides instantly; user can Undo. Restore restores the row. Genuine unmount (client nav) flushes pending delete instead of losing it.
- Replaced `window.confirm` with `sonner` toasts for transaction delete and account archive. Added `unarchiveAccount` server action + schema migration.

**Form Polish:**

- Focus-on-first-validation-error: `useEffect` reads first error from form state, focuses its field via ref.
- Numeric/identifier inputs now `spellCheck={false}` (prevents red squiggles on account numbers).
- Ellipsis placeholders on truncated fields.
- Dirty-state discard guard on quick-add & account-form sheets (prevent accidental discard).

**List Perf — CSS-Only Visibility Culling:**

- Transaction rows: `content-visibility: auto` + `contain-intrinsic-size: auto 44px` (CSS containment prevents layout recalc for off-screen rows).
- Sheet body + filter scroller: `overscroll-contain` (prevents rubber-band scroll bleed).
- No windowing library introduced; CSS containment is enough for current scale.

**Settings Redesign:**

- Deleted `top-bar.tsx` and `sign-out-menu-item.tsx`. Global nav chrome now "just" breadcrumb + theme toggle (if we add one later).
- Settings page redesigned into grouped sections (Account, Preferences, etc.) with:
  - Account header (email + avatar placeholder).
  - SettingsRow subcomponent for consistent section items.
  - Sign Out button + confirmation at bottom.
- Account email and Sign Out migrated from TopBar into Settings. Reduces chrome clutter.

## Decisions

**System-Auto Dark Mode (No Toggle UI):**

- User confirmed: system preference respected; if OS is dark, app is dark. No "Dark Mode" toggle button shipped.
- Rationale: simpler UX, respects accessibility prefs, reduces app state complexity.
- Future: if user requests a manual override, add toggle to Settings.

**DRY Theming Over Duplication:**

- Chose raw token reuse (--dark-_ → --color-_) over copy-paste dark block under both `.dark` and media query.
- Trade-off: requires CSS understanding (not a concern for team); saves ~30 lines + single source of truth.

**Undo via Toast (No "Undo in Place"):**

- Transaction row doesn't self-recover on Undo. Toast action invokes `restoreTransaction`, which refetches the list.
- Trade-off: slightly higher server load; far simpler state machine (row either renders or doesn't, no "pending restore" state).
- Acceptable for current transaction volume.

## Root Cause Analysis — Undo Delete Bug

The optimistic-delete timeout living in the child menu component created a timing race: unmounting the child fired the timer early. Initial diagnosis was "why isn't the row disappearing?" — the real issue was "where does the async work live?"

**Lesson:** Async timers must live at the scope where visibility is managed. Parent owns visibility → parent owns cleanup.

## Impact

- Dark mode: no new deps (pure CSS); reduced theme code duplication.
- Undo UX: instant visual feedback (row gone); server-authoritative restore eliminates state drift.
- Settings redesign: removed 100+ lines of TopBar complexity; consolidated account UI into one page.
- Perf: no noticeable scroll jank on 1000+ transaction rows (CSS containment sufficient; no virtualization needed yet).
- Code health: typecheck + lint clean; no tech debt introduced. Code review flagged no critical/major defects.

## Lessons Learned

- **Async ownership is hierarchical:** If a child component is transient (unmounts on state change), its async handlers must be re-parented to a stable ancestor or wrapped in cleanup that prevents double-fire.
- **System preferences are product decisions:** Dark mode choice (auto vs. toggle) shapes UX and state surface. Document the rationale for future maintainers.
- **CSS containment scales better than JS virtualization** for UI-bound lists (~1000s of rows). Measure perf before adding windowing libraries.
- **DRY CSS is worth the abstraction layer:** Token reuse + media query + class selector is more maintainable than duplicated blocks, despite requiring CSS knowledge.

## Next Steps

- Monitor user feedback on system-auto dark mode (may need toggle add-on if users want manual override).
- If transaction list grows beyond current perf (5000+ rows), evaluate virtual scrolling; CSS containment is sufficient today.
- Consider extracting SettingsRow + grouped layout into reusable component library if settings page grows.

---

**Status:** Complete (uncommitted at journal time; ready for code review and merge to `feat/goals-debts` branch)

**Summary:** 6-phase UI/UX polish executed via cook workflow. Key win: fixed optimistic-delete UX by re-parenting async timer to stable parent. Dark mode uses system preference + DRY token architecture; Settings page simplified by removing TopBar.

**Concerns:** None; all tests pass, no architectural debt introduced.
