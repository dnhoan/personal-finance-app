"use server";
import { requireSession } from "@/lib/auth-session";
import { createTxSchema, type CreateTxInput } from "../schemas";
import { insertTxIdempotent } from "../repository";
import { revalidateTxViews } from "./revalidate";

// Creates a single income/expense row. Idempotent on clientOpId: a retried
// submit (same key) inserts nothing and returns the originally-created id, so a
// double-tap or network replay can never double-post.
export async function createTransaction(input: CreateTxInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createTxSchema.parse(input);

  const id = await insertTxIdempotent(user.id, {
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    kind: data.kind,
    amount: data.amount,
    occurredAt: data.occurredAt,
    note: data.note?.trim() || null,
    merchant: data.merchant?.trim() || null,
    clientOpId: data.clientOpId,
  });

  revalidateTxViews();
  return { id };
}
