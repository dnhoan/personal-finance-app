"use server";
import { requireSession } from "@/lib/auth-session";
import { transferSchema, type TransferInput } from "../schemas";
import { insertTransferAtomic } from "../repository";
import { revalidateTxViews } from "./revalidate";

/**
 * Creates a transfer as TWO linked rows inside ONE transaction (see
 * insertTransferAtomic). Invariants:
 *  - Out-leg (source) stores a NEGATIVE amount + the clientOpId; in-leg
 *    (destination) stores the POSITIVE amount. Signed storage makes account
 *    balance a plain signed SUM; both legs display sign-less (transfers are
 *    neutral per the design guidelines).
 *  - Legs are mutually linked via `transfer_pair_id`; the self-FK is ON DELETE
 *    CASCADE, so deleting either leg removes both.
 *  - No follow-up round-trip, no orphan window. Idempotent on clientOpId.
 */
export async function createTransfer(input: TransferInput): Promise<{ pairId: string }> {
  const { user } = await requireSession();
  const data = transferSchema.parse(input);

  const pairId = await insertTransferAtomic(user.id, {
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    amount: data.amount,
    occurredAt: data.occurredAt,
    note: data.note?.trim() || null,
    clientOpId: data.clientOpId,
  });

  revalidateTxViews();
  return { pairId };
}
