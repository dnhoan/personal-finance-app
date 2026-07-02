"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { createTxSchema, type CreateTxInput } from "../schemas";
import { insertTxIdempotent } from "../repository";
import { assertTxRefsOwned } from "../lib/assert-tx-refs-owned";
import { revalidateTxViews } from "./revalidate";

// Creates a single income/expense row. Idempotent on clientOpId: a retried
// submit (same key) inserts nothing and returns the originally-created id, so a
// double-tap or network replay can never double-post.
export async function createTransaction(input: CreateTxInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createTxSchema.parse(input);

  // The account and category are client-supplied ids; verify the requester owns
  // them before writing, or a forged account_id/category_id could attach this
  // row to another user's account (cross-tenant IDOR).
  await assertTxRefsOwned(user.id, data.accountId, data.categoryId ?? null, data.kind);

  // A tagged goal must belong to the requester before we link the tx to it,
  // otherwise a forged goal_id could attribute someone else's savings progress.
  if (data.goalId) {
    const [goal] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, data.goalId), eq(goals.userId, user.id)));
    if (!goal) throw new Error("Mục tiêu không tồn tại");
  }

  const id = await insertTxIdempotent(user.id, {
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    goalId: data.goalId ?? null,
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
