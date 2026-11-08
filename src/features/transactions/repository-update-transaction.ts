import { db } from "@/lib/db/client";
import type { UpdateTxData } from "./schemas";
import { assertTxEditAllowed } from "./lib/assert-tx-edit-allowed";
import {
  convertToTransfer,
  convertTransferToSingle,
  lockTxForEdit,
  updateSingle,
  updateTransferPair,
  type SingleEdit,
  type TransferEdit,
} from "./repository-kind-transition";

/**
 * Applies an edit — including a change of kind — in ONE transaction:
 * lock R (+ M) → guard every client-supplied id against the locked state →
 * route on R's LOCKED kind. Routing on locked state is what makes a double-tap
 * safe: the second Chi→Chuyển sees R already a transfer and runs the
 * transfer→transfer branch with the same values (idempotent), instead of
 * inserting a second mirror.
 *
 * Session-free (callers pass userId) so integration tests can drive it directly.
 */
export async function updateTransactionInDb(userId: string, data: UpdateTxData): Promise<void> {
  const note = data.note?.trim() || null;
  const merchant = data.merchant === undefined ? undefined : data.merchant.trim() || null;

  await db.transaction(async (tx) => {
    const { r, m } = await lockTxForEdit(tx, userId, data.id);

    if (data.kind === "transfer") {
      const e: TransferEdit = {
        amount: data.amount,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        note,
        merchant,
      };
      // R stays on its own side of the flow: the out-leg (negative transfer, or
      // an expense being converted) is the source; everything else the target.
      const rIsOut = r.kind === "expense" || (r.kind === "transfer" && Number(r.amount) < 0);
      const branch = r.kind === "transfer" ? "transfer" : "toTransfer";
      await assertTxEditAllowed(tx, userId, {
        branch,
        r,
        m,
        rAccountId: rIsOut ? e.fromAccountId : e.toAccountId,
        mAccountId: rIsOut ? e.toAccountId : e.fromAccountId,
        categoryId: null,
        kind: "transfer",
      });
      if (branch === "transfer") await updateTransferPair(tx, userId, r, m!, e);
      else await convertToTransfer(tx, userId, r, e);
      return;
    }

    const e: SingleEdit = {
      kind: data.kind,
      amount: data.amount,
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      note,
      merchant,
    };
    const branch = r.kind === "transfer" ? "toSingle" : "single";
    await assertTxEditAllowed(tx, userId, {
      branch,
      r,
      m,
      rAccountId: e.accountId,
      mAccountId: null,
      categoryId: e.categoryId,
      kind: e.kind,
    });
    if (branch === "toSingle") await convertTransferToSingle(tx, userId, r, m!, e);
    else await updateSingle(tx, userId, r, e);
  });
}
