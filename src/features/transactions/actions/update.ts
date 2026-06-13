"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { updateTxSchema, type UpdateTxInput } from "../schemas";
import { revalidateTxViews } from "./revalidate";

// Edits an income/expense row. Transfer legs are intentionally NOT editable this
// round (delete + re-create instead) — block defensively in case the UI slips.
export async function updateTransaction(input: UpdateTxInput): Promise<void> {
  const { user } = await requireSession();
  const data = updateTxSchema.parse(input);

  const [target] = await db
    .select({ kind: transactions.kind })
    .from(transactions)
    .where(and(eq(transactions.id, data.id), eq(transactions.userId, user.id)));

  if (!target) throw new Error("Không tìm thấy giao dịch");
  if (target.kind === "transfer") {
    throw new Error("Không thể sửa giao dịch chuyển khoản — hãy xóa và tạo lại");
  }

  await db
    .update(transactions)
    .set({
      kind: data.kind,
      amount: String(data.amount),
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      occurredAt: data.occurredAt,
      note: data.note?.trim() || null,
      merchant: data.merchant?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, data.id), eq(transactions.userId, user.id)));

  revalidateTxViews();
}
