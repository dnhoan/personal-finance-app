import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions, accounts, categories } from "@/lib/db/schema";
import type { TxFilter } from "./schemas";

export type TxListItem = {
  id: string;
  kind: "income" | "expense" | "transfer";
  /** Signed for transfers (out leg negative); use Math.abs for display. */
  amount: number;
  occurredAt: Date;
  note: string | null;
  merchant: string | null;
  accountId: string;
  accountName: string;
  accountType: (typeof accounts.$inferSelect)["type"];
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  transferPairId: string | null;
};

const DEFAULT_LIMIT = 100;

// Server-only filtered list, newest first. Uses the (user_id, occurred_at DESC)
// composite index. Joins account (always present) + category (nullable).
export async function listTransactions(
  userId: string,
  filter: TxFilter = {},
): Promise<TxListItem[]> {
  const conds = [eq(transactions.userId, userId)];
  if (filter.from) conds.push(gte(transactions.occurredAt, filter.from));
  if (filter.to) conds.push(lte(transactions.occurredAt, filter.to));
  if (filter.kind) conds.push(eq(transactions.kind, filter.kind));
  if (filter.accountId) conds.push(eq(transactions.accountId, filter.accountId));
  if (filter.categoryId) conds.push(eq(transactions.categoryId, filter.categoryId));

  const rows = await db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      note: transactions.note,
      merchant: transactions.merchant,
      accountId: transactions.accountId,
      accountName: accounts.name,
      accountType: accounts.type,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      transferPairId: transactions.transferPairId,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...conds))
    .orderBy(desc(transactions.occurredAt))
    .limit(filter.limit ?? DEFAULT_LIMIT)
    .offset(filter.offset ?? 0);

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}
