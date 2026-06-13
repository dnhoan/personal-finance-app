"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { deleteTxSchema } from "../schemas";
import { revalidateTxViews } from "./revalidate";

// Deletes a transaction. For a transfer leg, the self-FK is ON DELETE CASCADE,
// so deleting either leg removes its paired leg too — both halves vanish
// atomically (the agreed delete-both behaviour).
export async function deleteTransaction(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const { id } = deleteTxSchema.parse(input);

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidateTxViews();
}
