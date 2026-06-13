# Phase 4 Transactions & Accounts Completion

**Date**: 2026-06-13
**Severity**: High (first usable surface; money-write correctness)
**Component**: Transactions, accounts, VND parser, quick-add
**Status**: Complete (pending commit)

## What Happened

Shipped the first usable surface: a ReDoS-safe VND shorthand parser, account CRUD
with computed balances, transaction create/delete + atomic transfers via Server
Actions, a bottom-sheet quick-add behind a FAB, and a filterable transaction list.
All gates green: typecheck, lint, build (9 routes), 70 unit/integration tests, 3
e2e route-protection tests.

## Technical Details

- **VND parser (`src/lib/vnd.ts`)** — hand-written scanner, no regex on input.
  Handles suffixes (k/tr/tỷ/chục, diacritic + ASCII), composites (`1tr500k`),
  thousands/decimal disambiguation, and rejects ambiguous bare decimals (`1.5`).
  41 cases + 2 fast-check fuzz properties. A char allow-list derived from the
  suffix tokens (not a hard-coded string) caught an ASCII-`u` gap during testing.
- **Transfer atomicity** — two mutually-linked legs in ONE `db.transaction`.
- **Signed transfer legs** — out-leg negative + carries clientOpId, in-leg
  positive. Account balance is then a plain signed `SUM(CASE kind …)`; transfers
  render sign-less so the internal sign is invisible to users.
- **Idempotency** — `client_op_id` partial-unique + `ON CONFLICT DO NOTHING`;
  on conflict the action reads back the prior id. Verified under parallel submit.
- **Money never floats** — `numeric(18,0)` round-trips as strings; UI parses to
  `Number` only for display/format.
- **Hand-authored UI primitives** — sheet (Radix Dialog, bottom slide + reduced
  motion), select (Radix Select), input, label — no shadcn CLI (no components.json,
  Tailwind v4). Added `tw-animate-css` import so sheet animations resolve.

## Root Cause Analysis

Two bugs caught by tests mid-build:

1. **wCTE couldn't self-link the transfer pair.** The plan's single-statement CTE
   used a `gen_random_uuid()` shared `pair_id`, but Phase 3 made `transfer_pair_id`
   a self-FK to `transactions.id` — a random uuid violates the FK. Reworked to
   mutual linking; that needs the out-leg UPDATEd _after_ the in-leg exists, which
   a data-modifying CTE can't do (it sees only the start snapshot). Switched to a
   real `db.transaction` — equally atomic, no orphan window (FK-failure test proves it).
2. Parser rejected `3 chuc` (ASCII) — the allow-list had `ụ` but not plain `u`.
   Fixed by deriving the allow-list from the suffix tokens.

## Decision Points

- **Transfer edit deferred (user-confirmed delete-both).** Deleting either leg
  cascades the pair; editing a transfer is out of scope (delete + re-create).
- **Date filter = preset chips + native date inputs** (user-confirmed) over
  `react-day-picker` — fewer deps, native mobile pickers.
- **Income/expense edit UI deferred.** The `updateTransaction` action exists and
  type-checks; the pre-filled edit sheet is a fast-follow. Create + delete UIs ship.
- **`chục` = ×10 (literal).** Flagged: if it should mean 10.000₫ in money slang,
  it's a one-line multiplier change.

## Lessons

- Re-validate a later phase's data-write recipe against the schema the earlier
  phase actually built — the CTE recipe was written before the self-FK existed.
- "Single SQL statement" is not the only way to be atomic; a transaction is just
  as safe and avoids the wCTE snapshot trap for self-referential writes.
