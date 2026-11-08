import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import type { DbExecutor } from "./repository";
import { TxEditRejection } from "./lib/tx-edit-rejection";

// Pure DB writes for editing a transaction across kinds. Every helper takes an
// open transaction handle and the rows already locked by `lockTxForEdit`, so the
// branch is chosen from state no concurrent request can change underneath it.
//
// Invariant across all branches: the row the user opened (R) is always kept and
// its id never changes; only the transfer counterpart (M) is inserted or deleted.
// That keeps detail-page URLs and bank_sync_events.transaction_id valid.
//
// Sign rule (same as writeTransferPair): income/expense store a positive
// magnitude; transfer legs are signed — out-leg (source) negative, in-leg
// (destination) positive — so account balance stays a plain signed SUM.

export type LockedTx = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: string;
  accountId: string;
  categoryId: string | null;
  transferPairId: string | null;
  source: "manual" | "bank_sync";
  occurredAt: Date;
};

const lockedColumns = {
  id: transactions.id,
  kind: transactions.kind,
  amount: transactions.amount,
  accountId: transactions.accountId,
  categoryId: transactions.categoryId,
  transferPairId: transactions.transferPairId,
  source: transactions.source,
  occurredAt: transactions.occurredAt,
};

export type SingleEdit = {
  kind: "income" | "expense";
  amount: number;
  accountId: string;
  categoryId: string | null;
  note: string | null;
  /** undefined = keep the stored merchant. */
  merchant: string | null | undefined;
};

export type TransferEdit = {
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  note: string | null;
  merchant: string | null | undefined;
};

/**
 * Locks R (and its counterpart M when R is a transfer leg) FOR UPDATE.
 *
 * Rows are locked in id order so two edits of the same pair cannot deadlock.
 * R's pair id is peeked without a lock first; if a concurrent edit changed it
 * before our lock landed (e.g. a double-tapped Chi→Chuyển just committed), the
 * newly-current M is locked too — R is already ours, so M cannot be re-paired.
 * M must point back at R (mutual link, same user) or the pair is rejected.
 */
export async function lockTxForEdit(
  tx: DbExecutor,
  userId: string,
  id: string,
): Promise<{ r: LockedTx; m: LockedTx | null }> {
  const [peek] = await tx
    .select({ pairId: transactions.transferPairId })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!peek) throw new TxEditRejection("Không tìm thấy giao dịch");

  const ids = peek.pairId ? [id, peek.pairId] : [id];
  const locked = await tx
    .select(lockedColumns)
    .from(transactions)
    .where(and(inArray(transactions.id, ids), eq(transactions.userId, userId)))
    .orderBy(asc(transactions.id))
    .for("update");

  const r = locked.find((row) => row.id === id);
  if (!r) throw new TxEditRejection("Không tìm thấy giao dịch");
  if (r.kind !== "transfer") return { r, m: null };

  let m = locked.find((row) => row.id === r.transferPairId) ?? null;
  if (!m && r.transferPairId) {
    [m = null] = await tx
      .select(lockedColumns)
      .from(transactions)
      .where(and(eq(transactions.id, r.transferPairId), eq(transactions.userId, userId)))
      .for("update");
  }
  if (!m || m.transferPairId !== r.id) throw new TxEditRejection("Cặp chuyển khoản không hợp lệ");
  return { r, m };
}

// Throws when a conditional write matched nothing — the locked state no longer
// holds, so the whole transaction must roll back rather than half-apply.
function expectOne(rows: unknown[]): void {
  if (rows.length !== 1) throw new TxEditRejection("Giao dịch vừa thay đổi — vui lòng thử lại");
}

function merchantPatch(merchant: string | null | undefined) {
  return merchant === undefined ? {} : { merchant };
}

/** income/expense → income/expense (the pre-existing edit). */
export async function updateSingle(tx: DbExecutor, userId: string, r: LockedTx, e: SingleEdit) {
  const rows = await tx
    .update(transactions)
    .set({
      kind: e.kind,
      amount: String(e.amount),
      accountId: e.accountId,
      categoryId: e.categoryId,
      note: e.note,
      ...merchantPatch(e.merchant),
      // Giving a bank-synced row a category IS the act of reviewing it; clearing
      // the category leaves its status alone so a pending row stays in the inbox.
      reviewStatus: e.categoryId ? "confirmed" : sql`review_status`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, r.id),
        eq(transactions.userId, userId),
        eq(transactions.kind, r.kind),
      ),
    )
    .returning({ id: transactions.id });
  expectOne(rows);
}

/**
 * income/expense → transfer. An expense becomes the out-leg (its account is the
 * source), an income the in-leg (destination). Category, goal and recurring
 * link are cleared — a transfer carries none — and the row counts as reviewed.
 * The inserted mirror is a manual row.
 */
export async function convertToTransfer(
  tx: DbExecutor,
  userId: string,
  r: LockedTx,
  e: TransferEdit,
) {
  const rIsOut = r.kind === "expense";
  const [mate] = await tx
    .insert(transactions)
    .values({
      userId,
      accountId: rIsOut ? e.toAccountId : e.fromAccountId,
      kind: "transfer",
      amount: String(rIsOut ? e.amount : -e.amount),
      occurredAt: r.occurredAt,
      note: e.note,
      transferPairId: r.id,
    })
    .returning({ id: transactions.id });

  const rows = await tx
    .update(transactions)
    .set({
      kind: "transfer",
      amount: String(rIsOut ? -e.amount : e.amount),
      accountId: rIsOut ? e.fromAccountId : e.toAccountId,
      categoryId: null,
      goalId: null,
      recurringRuleId: null,
      transferPairId: mate!.id,
      reviewStatus: "confirmed",
      note: e.note,
      ...merchantPatch(e.merchant),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, r.id),
        eq(transactions.userId, userId),
        eq(transactions.kind, r.kind),
      ),
    )
    .returning({ id: transactions.id });
  expectOne(rows);
}

/**
 * transfer → income/expense. R is unlinked first: transfer_pair_id is ON DELETE
 * CASCADE, so deleting M while R still points at it would delete R too.
 */
export async function convertTransferToSingle(
  tx: DbExecutor,
  userId: string,
  r: LockedTx,
  m: LockedTx,
  e: SingleEdit,
) {
  const rows = await tx
    .update(transactions)
    .set({
      kind: e.kind,
      amount: String(e.amount),
      accountId: e.accountId,
      categoryId: e.categoryId,
      transferPairId: null,
      note: e.note,
      ...merchantPatch(e.merchant),
      reviewStatus: e.categoryId ? "confirmed" : sql`review_status`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, r.id),
        eq(transactions.userId, userId),
        eq(transactions.transferPairId, m.id),
      ),
    )
    .returning({ id: transactions.id });
  expectOne(rows);

  const deleted = await tx
    .delete(transactions)
    .where(
      and(
        eq(transactions.id, m.id),
        eq(transactions.userId, userId),
        eq(transactions.transferPairId, r.id),
      ),
    )
    .returning({ id: transactions.id });
  expectOne(deleted);
}

/** transfer → transfer: both legs follow the new from/to/amount/note. */
export async function updateTransferPair(
  tx: DbExecutor,
  userId: string,
  r: LockedTx,
  m: LockedTx,
  e: TransferEdit,
) {
  const rIsOut = Number(r.amount) < 0;
  const legs = [
    { row: r, isOut: rIsOut, mate: m, merchant: merchantPatch(e.merchant) },
    { row: m, isOut: !rIsOut, mate: r, merchant: {} },
  ];
  for (const leg of legs) {
    const rows = await tx
      .update(transactions)
      .set({
        accountId: leg.isOut ? e.fromAccountId : e.toAccountId,
        amount: String(leg.isOut ? -e.amount : e.amount),
        note: e.note,
        ...leg.merchant,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, leg.row.id),
          eq(transactions.userId, userId),
          eq(transactions.transferPairId, leg.mate.id),
        ),
      )
      .returning({ id: transactions.id });
    expectOne(rows);
  }
}
