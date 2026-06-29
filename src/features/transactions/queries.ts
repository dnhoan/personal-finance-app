import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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
  recurringRuleId: string | null;
};

const DEFAULT_LIMIT = 100;

// Shared WHERE builder so the list, page, and aggregate queries always filter
// on identical conditions.
function filterConditions(userId: string, filter: TxFilter) {
  const conds = [eq(transactions.userId, userId)];
  if (filter.from) conds.push(gte(transactions.occurredAt, filter.from));
  if (filter.to) conds.push(lte(transactions.occurredAt, filter.to));
  if (filter.kind) conds.push(eq(transactions.kind, filter.kind));
  if (filter.accountId) conds.push(eq(transactions.accountId, filter.accountId));
  if (filter.categoryId) conds.push(eq(transactions.categoryId, filter.categoryId));
  return conds;
}

// Server-only filtered list, newest first. Uses the (user_id, occurred_at DESC)
// composite index. Joins account (always present) + category (nullable).
export async function listTransactions(
  userId: string,
  filter: TxFilter = {},
): Promise<TxListItem[]> {
  const conds = filterConditions(userId, filter);

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
      recurringRuleId: transactions.recurringRuleId,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...conds))
    // `id` is a deterministic tie-break so OFFSET paging (load-more) never skips
    // or repeats a row when several share an `occurredAt` (transfer legs, quick-adds
    // defaulting to now). Without it Postgres orders ties arbitrarily per query.
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(filter.limit ?? DEFAULT_LIMIT)
    .offset(filter.offset ?? 0);

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export type TxPage = { items: TxListItem[]; hasMore: boolean };

// Paginated read for "load more": fetches one extra row beyond the requested
// limit to know whether more exist, then trims it. Avoids the false "more" that
// `items.length === limit` reports when the count is an exact multiple.
export async function listTransactionsPage(userId: string, filter: TxFilter = {}): Promise<TxPage> {
  const limit = filter.limit ?? DEFAULT_LIMIT;
  const items = await listTransactions(userId, { ...filter, limit: limit + 1 });
  const hasMore = items.length > limit;
  return { items: hasMore ? items.slice(0, limit) : items, hasMore };
}

export type TxSummary = { income: number; expense: number; net: number; count: number };

// Period aggregate for the summary header. Computed in the DB over the SAME
// filter as the list, so it stays accurate regardless of pagination/limit.
// Transfers are excluded from net (their two legs cancel; net = income − expense).
export async function summariseTransactions(
  userId: string,
  filter: TxFilter = {},
): Promise<TxSummary> {
  const conds = filterConditions(userId, filter);

  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'income'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'expense'), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(and(...conds));

  const income = Number(row?.income ?? 0);
  const expense = Number(row?.expense ?? 0);
  return { income, expense, net: income - expense, count: Number(row?.count ?? 0) };
}
