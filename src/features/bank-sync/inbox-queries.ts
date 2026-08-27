import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, bankLinks, bankSyncEvents, categories, transactions } from "@/lib/db/schema";
import { txListSelection, type TxListItem } from "@/features/transactions/queries";

// A pending row plus the bank it came from, which the inbox shows so the user can
// tell two linked accounts apart at a glance.
export type PendingTxItem = TxListItem & { gateway: string | null };

const PENDING_PAGE_SIZE = 100;

/**
 * Bank-synced rows still awaiting a category, newest first.
 *
 * Rides the existing (user_id, occurred_at DESC) index — Phase 1 deliberately
 * added no status index, because the pending set is expected to stay small.
 * The gateway comes from the journal row that created the transaction; the
 * bank_sync_events_transaction_idx index exists for exactly this join.
 */
export async function listPendingTransactions(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<PendingTxItem[]> {
  const rows = await db
    .select({ ...txListSelection, gateway: bankLinks.gateway })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(bankSyncEvents, eq(bankSyncEvents.transactionId, transactions.id))
    .leftJoin(bankLinks, eq(bankLinks.id, bankSyncEvents.bankLinkId))
    .where(and(eq(transactions.userId, userId), eq(transactions.reviewStatus, "pending")))
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(options.limit ?? PENDING_PAGE_SIZE)
    .offset(options.offset ?? 0);

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

// Drives the nav badge and the dashboard card.
export async function countPendingTransactions(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.reviewStatus, "pending")));
  return row?.value ?? 0;
}

// Deliveries that matched no bank link — almost always a mistyped account
// number. Surfaced as a banner because the money is real but invisible until the
// mapping is fixed.
export async function countUnmatchedEvents(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(bankSyncEvents)
    .where(and(eq(bankSyncEvents.userId, userId), eq(bankSyncEvents.status, "unmatched")));
  return row?.value ?? 0;
}

// Whether the user has any bank link at all — the empty state points a user with
// none at the setup screen rather than implying something went wrong.
export async function hasAnyBankLink(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: bankLinks.id })
    .from(bankLinks)
    .where(eq(bankLinks.userId, userId))
    .limit(1);
  return row !== undefined;
}

// Count plus absolute value pending review, for the dashboard card.
export async function pendingReviewSummary(
  userId: string,
): Promise<{ count: number; total: number }> {
  const [row] = await db
    .select({
      value: count(),
      total: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.reviewStatus, "pending")));
  return { count: row?.value ?? 0, total: Number(row?.total ?? 0) };
}
