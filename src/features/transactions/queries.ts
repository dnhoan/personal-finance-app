import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { transactions, accounts, categories, goals } from "@/lib/db/schema";
import { confirmedOnly } from "./lib/review-status-filter";
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
  reviewStatus: "pending" | "confirmed";
};

// Single source of truth for the row projection the list and detail reads share.
// Exported so the review inbox projects rows identically instead of cloning the shape.
// Both join account (always present) + category (nullable); detail extends this
// with a goal name. Kept as one object so a column added here reaches every read.
export const txListSelection = {
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
  // The ledger only ever shows confirmed rows, but the detail page and the review
  // inbox both open pending ones and must be able to say so.
  reviewStatus: transactions.reviewStatus,
} as const;

// Ledger rows carry what the edit sheet needs on top of the shared projection:
// the transfer counterpart's account (to prefill Từ/Đến), the goal tag (to warn
// that a transfer drops it) and the row's provenance (bank-synced rows keep their
// account). Kept OUT of txListSelection on purpose — the review inbox reuses that
// projection without the counterpart join and must not reference its alias.
export type TxLedgerItem = TxListItem & {
  goalId: string | null;
  source: "manual" | "bank_sync";
  /** Counterpart leg's account; null for non-transfers or a broken pair. */
  transferMateAccountId: string | null;
  transferMateAccountName: string | null;
};

const mate = alias(transactions, "mate");
const mateAccount = alias(accounts, "mate_account");

const DEFAULT_LIMIT = 100;

// Shared WHERE builder so the list, page, and aggregate queries always filter
// on identical conditions.
function filterConditions(userId: string, filter: TxFilter) {
  // Pending bank-sync rows are hidden from the ledger and its summary until the
  // user categorises them in the inbox. getTransactionDetail deliberately does
  // NOT go through here — the inbox deep-links straight to a pending row.
  const conds = [eq(transactions.userId, userId), confirmedOnly];
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
): Promise<TxLedgerItem[]> {
  const conds = filterConditions(userId, filter);

  const rows = await db
    .select({
      ...txListSelection,
      goalId: transactions.goalId,
      source: transactions.source,
      transferMateAccountId: mate.accountId,
      transferMateAccountName: mateAccount.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    // Counterpart must be same-user AND point back at this row (mutual link);
    // anything else reads as a broken pair (null) and the UI hides Edit.
    .leftJoin(
      mate,
      and(
        eq(mate.id, transactions.transferPairId),
        eq(mate.userId, transactions.userId),
        eq(mate.transferPairId, transactions.id),
      ),
    )
    .leftJoin(mateAccount, eq(mateAccount.id, mate.accountId))
    .where(and(...conds))
    // `id` is a deterministic tie-break so OFFSET paging (load-more) never skips
    // or repeats a row when several share an `occurredAt` (transfer legs, quick-adds
    // defaulting to now). Without it Postgres orders ties arbitrarily per query.
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(filter.limit ?? DEFAULT_LIMIT)
    .offset(filter.offset ?? 0);

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export type TxPage = { items: TxLedgerItem[]; hasMore: boolean };

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
  goalId: string | null;
  goalName: string | null;
  source: "manual" | "bank_sync";
  /**
   * Populated only for transfers: source/destination account names by leg sign,
   * plus the counterpart's account for the edit sheet. `mateAccountId` is null
   * when the counterpart does not link back (broken pair → not editable).
   */
  transfer: {
    fromAccountName: string;
    toAccountName: string;
    mateAccountId: string | null;
    mateAccountName: string;
  } | null;
};

// Server-only single-transaction read for the detail page. Filters by PK + user_id
// so an unknown or non-owned id returns null (caller maps to notFound(), no leak).
// For a transfer leg it resolves the paired leg — also scoped to user_id (defence
// in depth) — to show both accounts and a direction.
export async function getTransactionDetail(userId: string, id: string): Promise<TxDetail | null> {
  const [row] = await db
    .select({
      ...txListSelection,
      goalId: transactions.goalId,
      goalName: goals.name,
      source: transactions.source,
    })
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
      .select({
        accountId: transactions.accountId,
        accountName: accounts.name,
        pairId: transactions.transferPairId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(eq(transactions.id, detail.transferPairId), eq(transactions.userId, userId)))
      .limit(1);

    if (mate) {
      // Signed-storage invariant (actions/transfer.ts): the out-leg is stored
      // negative (source), the in-leg positive (destination). If the mate is
      // missing (shouldn't happen), transfer stays null and the UI falls back to
      // this leg's single account.
      const names =
        detail.amount < 0
          ? { fromAccountName: detail.accountName, toAccountName: mate.accountName }
          : { fromAccountName: mate.accountName, toAccountName: detail.accountName };
      detail.transfer = {
        ...names,
        mateAccountId: mate.pairId === detail.id ? mate.accountId : null,
        mateAccountName: mate.accountName,
      };
    }
  }

  return detail;
}
