# Dedicated /add Capture Page with Numeric Keypad

**Date:** 2026-07-01
**Scope:** Replace the bottom-sheet quick-add with a full-screen `/add` route optimized for fastest entry — custom numeric keypad, pre-filled context, optimistic save. Goal (user's words): add a transaction the fastest with minimal screen operation and no wait loading.
**Commit:** `8d33860` on `feat/ui-interaction-feedback-animations`.

## What shipped

- `app/(app)/add/page.tsx` + `loading.tsx` — server route, dashboard-style data batch (accounts/categories/goals/defaults), skeleton for instant first paint.
- `features/transactions/components/add/` — `add-transaction-screen` (RHF + optimistic submit), `amount-readout` (live-formatted hero, extracted from the old amount field), `context-fields` (compact account/category/goal/date/note), `amount-keypad`.
- `features/transactions/lib/amount-keypad-reducer.ts` — pure integer-VND state machine (digit/zeros/mult/add/backspace/clear), clamps every path to `MAX_VND`. 9 unit tests.
- `features/transactions/lib/quick-add-form.ts` — shared helpers/types (`SUBMIT_LABEL`, `occurredAtFromInput`, `seedCategory`, `DefaultCategoryByKind`, `AccountOption`) extracted before the sheet was deleted.
- Global add entry point: docked center ＋ in `bottom-nav` (2 tabs · ＋ · 2 tabs) + desktop `desktop-add-fab`; both hidden on `/add`. Per-page `QuickAddLauncher` mounts removed from dashboard + transactions.
- Deleted `quick-add-sheet` / `quick-add-launcher` / `quick-add-amount-field`; dropped the account-detail account-scoped quick-add (pills + embedded sheet), pruned now-unused props/fetches.

## Three decisions that mattered

**1. Optimistic save is fire-and-forget with an idempotent retry.**
Save builds a payload with a fresh `clientOpId`, runs the server action inside `startTransition`, then _immediately_ resets the amount to 0 for the next entry — the UI never awaits the network. On failure a "Thử lại" toast re-sends the _same_ payload/`clientOpId`; the server's `onConflictDoNothing` on the clientOpId unique index makes retry safe. The retry closure captures a stable spread-snapshot, so the immediate `reset()` can't mutate the in-flight payload.

**2. The keypad replaces typed shorthand, not just the sheet.**
The old field parsed `50k`/`1,5tr` via `parseVnd`. The keypad drops typed shorthand for `×1k`/`×1tr` keys + presets (`+10k/+50k/+100k`) so no OS keyboard ever appears — the single biggest "minimal operation" win. Amount logic lives in a pure reducer, not the component, so overflow/clamp behavior is unit-testable independent of React.

**3. Global entry point simplified the plan mid-flight.**
The user's follow-up ("put the FAB in the middle of the nav bar") turned per-page FAB mounting into one global affordance. That _removed_ work (no per-page launchers) and made the account-detail decision fall out cleanly: drop its account-scoped quick-add, let the global button cover it.

## Two catches from the gates

**Validation found a hidden consumer.** The plan listed dashboard + transactions as the quick-add mount sites; verification surfaced a third — `account-detail-header.tsx` mounted the sheet directly. Deleting the sheet would have broken it. Resolved by dropping that page's account-scoped add entirely (accepted scope trade-off: loses transfer-from-this-account shortcut).

**Code review found a real below-fold bug.** The screen used `min-h-[100dvh]` while rendering _inside_ the `(app)` layout's `<main>` (`pt` inset + `pb-24` nav clearance). Total document height = `top-inset + 100dvh + 6rem`, so the page scrolled and the `mt-auto` keypad/Save was pushed off-screen on load. Fixed by cancelling the layout's vertical padding on the screen root (negative margins) and re-adding a safe-area top pad, so the screen is exactly one viewport tall.

**Lesson:** a component that assumes it owns the viewport (`100dvh`) is wrong the moment it's nested in a padded shell — the shell's clearance padding (there for a nav that's _hidden on this route_) silently becomes overflow.

## Gates

typecheck ✅ · build ✅ (`/add` 18.2 kB) · eslint ✅ · 237 unit tests ✅ (9 new keypad-reducer).

## Unresolved

- Not yet verified live on a real device — the below-fold fix is reasoned but unconfirmed on a physical viewport (dvh + safe-area behavior on iOS Safari especially).
- Removed the typed `50k`/`1,5tr` shorthand ergonomic; `parseVnd` stays available if a shorthand path is ever re-added.
