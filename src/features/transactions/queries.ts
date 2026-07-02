import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions, accounts, categories, goals } from "@/lib/db/schema";
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

// Single source of truth for the row projection the list and detail reads share.
// Both join account (always present) + category (nullable); detail extends this
// with a goal name. Kept as one object so a column added here reaches every read.
const txListSelection = {
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
} as const;

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
    .select(txListSelection)
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

// One transaction's full detail: every list field + the goal name (for the facts
// chip) + a resolved transfer counterpart. Audit timestamps are intentionally not
// selected — the detail facts show essentials + goal only.
export type TxDetail = TxListItem & {
  goalName: string | null;
  /** Populated only for transfers: source/destination account names by leg sign. */
  transfer: { fromAccountName: string; toAccountName: string } | null;
};

// Server-only single-transaction read for the detail page. Filters by PK + user_id
// so an unknown or non-owned id returns null (caller maps to notFound(), no leak).
// For a transfer leg it resolves the paired leg — also scoped to user_id (defence
// in depth) — to show both accounts and a direction.
export async function getTransactionDetail(userId: string, id: string): Promise<TxDetail | null> {
  const [row] = await db
    .select({ ...txListSelection, goalName: goals.name })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(goals, eq(goals.id, transactions.goalId))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (!row) return null;

  const detail: TxDetail = { ...row, amount: Number(row.amount), transfer: null };

  if (detail.kind === "transfer" && detail.transferPairId) {
    const [mate] = await db
      .select({ accountName: accounts.name })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(eq(transactions.id, detail.transferPairId), eq(transactions.userId, userId)))
      .limit(1);

    if (mate) {
      // Signed-storage invariant (actions/transfer.ts): the out-leg is stored
      // negative (source), the in-leg positive (destination). If the mate is
      // missing (shouldn't happen), transfer stays null and the UI falls back to
      // this leg's single account.
      detail.transfer =
        detail.amount < 0
          ? { fromAccountName: detail.accountName, toAccountName: mate.accountName }
          : { fromAccountName: mate.accountName, toAccountName: detail.accountName };
    }
  }

  return detail;
}
