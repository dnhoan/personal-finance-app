"use server";
import { requireSession } from "@/lib/auth-session";
import { updateTxSchema, type UpdateTxInput } from "../schemas";
import { updateTransactionInDb } from "../repository-update-transaction";
import { TxEditRejection } from "../lib/tx-edit-rejection";
import { revalidateTxViews } from "./revalidate";

export type UpdateTxResult = { ok: true } | { ok: false; message: string };

// Edits a transaction, including switching it between Chi / Thu / Chuyển. The
// row keeps its id in every branch, so the caller never needs to redirect. All
// locking, guards and the four kind transitions live in updateTransactionInDb.
// Expected refusals come back as `{ ok: false, message }` so their copy survives
// production error masking; anything unexpected still throws.
export async function updateTransaction(input: UpdateTxInput): Promise<UpdateTxResult> {
  const { user } = await requireSession();
  const data = updateTxSchema.parse(input);
  try {
    await updateTransactionInDb(user.id, data);
  } catch (err) {
    if (err instanceof TxEditRejection) return { ok: false, message: err.message };
    throw err;
  }
  revalidateTxViews();
  return { ok: true };
}
