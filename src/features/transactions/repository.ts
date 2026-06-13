import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";

// Pure DB operations for transactions — no session/auth (callers pass userId).
// Kept free of "server-only" so the idempotency + transfer-atomicity logic can
// be exercised directly by integration tests against a Neon branch.

export type InsertTxData = {
  accountId: string;
  categoryId: string | null;
  kind: "income" | "expense";
  amount: number;
  occurredAt: Date;
  note: string | null;
  merchant: string | null;
  clientOpId: string;
};

// Inserts one income/expense row, idempotent on clientOpId. On conflict (retry)
// returns the existing row's id instead of inserting a duplicate.
export async function insertTxIdempotent(userId: string, data: InsertTxData): Promise<string> {
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      kind: data.kind,
      amount: String(data.amount),
      occurredAt: data.occurredAt,
      note: data.note,
      merchant: data.merchant,
      clientOpId: data.clientOpId,
    })
    .onConflictDoNothing({
      target: transactions.clientOpId,
      where: sql`${transactions.clientOpId} is not null`,
    })
    .returning({ id: transactions.id });

  if (row) return row.id;
  return findIdByClientOpId(userId, data.clientOpId);
}

export type InsertTransferData = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAt: Date;
  note: string | null;
  clientOpId: string;
};

// Writes a transfer as two mutually-linked rows inside ONE transaction. Out-leg
// is negative + carries clientOpId; in-leg is positive. See transfer.ts action
// for the full invariant docs. Returns the out-leg id as the pair handle;
// idempotent on clientOpId.
//
// A real transaction (not a single wCTE) is required: the legs reference each
// other via transfer_pair_id, and the out-leg can only be linked to the in-leg
// AFTER the in-leg exists. A data-modifying CTE sees only the start snapshot, so
// it cannot update the row it just inserted; sequential statements in a tx can.
// The WebSocket Neon driver gives a true transaction — all-or-nothing, no orphan.
export async function insertTransferAtomic(
  userId: string,
  data: InsertTransferData,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [out] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: data.fromAccountId,
        kind: "transfer",
        amount: String(-data.amount), // out leg negative
        occurredAt: data.occurredAt,
        note: data.note,
        clientOpId: data.clientOpId,
      })
      .onConflictDoNothing({
        target: transactions.clientOpId,
        where: sql`${transactions.clientOpId} is not null`,
      })
      .returning({ id: transactions.id });

    // Idempotent retry: out-leg already exists → return the persisted pair.
    if (!out) return findIdByClientOpId(userId, data.clientOpId);

    const [inc] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: data.toAccountId,
        kind: "transfer",
        amount: String(data.amount), // in leg positive
        occurredAt: data.occurredAt,
        note: data.note,
        transferPairId: out.id,
      })
      .returning({ id: transactions.id });

    await tx
      .update(transactions)
      .set({ transferPairId: inc!.id })
      .where(eq(transactions.id, out.id));

    return out.id;
  });
}

async function findIdByClientOpId(userId: string, clientOpId: string): Promise<string> {
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.clientOpId, clientOpId)));
  if (!existing) throw new Error("Idempotency lookup failed: no row for clientOpId");
  return existing.id;
}
