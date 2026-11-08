# Edit Transaction: Category Picker + Chi/Thu/Chuyển Switch

**Date**: 2026-11-08
**Severity**: N/A — feature complete
**Component**: transactions (update action, edit sheet), bank-sync inbox
**Status**: Resolved — on branch `feat/edit-transaction-category-and-kind`, not yet committed

## What Happened

The edit sheet now changes category and switches between Chi / Thu / Chuyển, including editing both legs of a transfer. Four server branches run in one transaction with `SELECT … FOR UPDATE`. The opened row always keeps its id, so the detail page never needs a redirect and bank events stay valid. Typecheck and lint pass; 217 unit + full integration suite green (18 new kind-transition tests).

## The Brutal Truth

The red-teamed plan still missed one thing: inbox-merged transfers. `mergeAsTransfer` writes both legs via `writeTransferPair` as `source='manual'` and points every bank event at the out-leg only. A guard keyed on `source='bank_sync'` let a user open the out-leg, switch to Chi, and delete the bank-backed in-leg, so that bank account's balance drifted from the bank. The code reviewer caught it, not the plan. Lesson: "bank provenance" is not one column. It is source OR events OR bank-link, and the merge path quietly erases the column.

## Technical Details

- Lock order: peek pair id → lock `{R, M}` ordered by id → if R was re-paired in between (double-tap), lock the new M after R. Routing on the _locked_ kind makes a double-submitted Chi→Chuyển idempotent (second request runs transfer→transfer).
- transfer→single must unlink R before deleting M: `transfer_pair_id` is ON DELETE CASCADE, so deleting M while R still points at it deletes R.
- Bank-backed leg = `source='bank_sync'` OR has an event OR (pair has events AND leg's account is bank-linked). No migration was needed.
- `TxEditRejection` → `{ ok:false, message }`: Next 15 masks thrown Server Action messages in production, so actionable Vietnamese copy needs a return value.
- Kept `txListSelection` untouched; the mate alias join lives only in the ledger queries because the inbox reuses the shared projection.

## What We Tried

Sheet reset effect keyed on `tx` would wipe user input on any revalidation while open (uncontrolled amount input kept showing the typed value → Save sent the old amount). Switched to resetting only on the closed→open transition.

## Root Cause Analysis

Merged-pair gap: provenance stored in `source` is lost by the merge flow; guards trusted the column.

## Lessons Learned

- Grep every writer of a table before trusting a provenance column in a guard.
- Put the transactional core in a session-free repository function; integration tests then cover races and guards without mocking auth.

## Next Steps

- Optional: have `mergeAsTransfer` stamp `source='bank_sync'` so the UI can pre-lock merged pairs (it currently relies on the server message).
- Pre-existing: `eslint .` scans gitignored `public/sw.js` + `coverage/`; add them to the eslint ignores.
