"use server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, transactions, bankSyncEvents } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { revalidateTxViews } from "@/features/transactions/actions/revalidate";
import { writeTransferPair } from "@/features/transactions/repository";
import { reprocessUnmatchedEvents as reprocessUnmatchedEventsCore } from "@/server/webhooks/sepay/reprocess-unmatched-events";
import { revalidatePath } from "next/cache";
import {
  confirmManySchema,
  confirmTransactionSchema,
  mergeAsTransferSchema,
  MERGE_MAX_DAY_GAP,
  undoBulkConfirmSchema,
  type ConfirmManyInput,
  type ConfirmTransactionInput,
  type MergeAsTransferInput,
} from "./inbox-schemas";

function revalidateInboxViews() {
  revalidateTxViews();
  revalidatePath("/inbox");
}

// Confirms the category matches the transaction's direction. Never trusted from
// the client: a mismatched pair would file an expense under an income category
// and quietly corrupt every category report.
async function assertCategoryMatchesKind(
  userId: string,
  categoryId: string,
  kind: "income" | "expense",
): Promise<void> {
  const [category] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!category) throw new Error("Danh mục không tồn tại");
  if (category.kind !== kind) throw new Error("Danh mục không khớp loại thu/chi");
}

export type ConfirmResult = { ok: boolean; message?: string };

/**
 * Categorises one pending row, which is what "reviewing" means.
 *
 * The UPDATE carries `review_status = 'pending'` in its WHERE clause, so two
 * tabs racing on the same row cannot overwrite each other — the loser simply
 * matches nothing. That is reported as a soft result rather than thrown,
 * because "someone already did this" is not an error the user needs to recover from.
 */
export async function confirmTransaction(input: ConfirmTransactionInput): Promise<ConfirmResult> {
  const { user } = await requireSession();
  const data = confirmTransactionSchema.parse(input);

  const [target] = await db
    .select({ kind: transactions.kind })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, data.id),
        eq(transactions.userId, user.id),
        eq(transactions.reviewStatus, "pending"),
      ),
    );
  if (!target) return { ok: false, message: "Giao dịch này đã được phân loại" };
  if (target.kind === "transfer")
    return { ok: false, message: "Không phân loại được chuyển khoản" };

  await assertCategoryMatchesKind(user.id, data.categoryId, target.kind);

  const updated = await db
    .update(transactions)
    .set({
      categoryId: data.categoryId,
      reviewStatus: "confirmed",
      ...(data.accountId ? { accountId: data.accountId } : {}),
      ...(data.note !== undefined ? { note: data.note || null } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, data.id),
        eq(transactions.userId, user.id),
        eq(transactions.reviewStatus, "pending"),
      ),
    )
    .returning({ id: transactions.id });

  if (updated.length === 0) return { ok: false, message: "Giao dịch này đã được phân loại" };

  revalidateInboxViews();
  return { ok: true };
}

/**
 * Applies one category to many pending rows.
 *
 * Writes EXACTLY two columns — category_id and review_status — and that
 * restraint is what makes undo possible: reversing two known columns needs no
 * per-row snapshot of prior values. Editing an account or note in bulk would
 * require one, which is a different feature; those stay single-row edits.
 */
export async function confirmManyTransactions(
  input: ConfirmManyInput,
): Promise<{ changed: number }> {
  const { user } = await requireSession();
  const data = confirmManySchema.parse(input);

  const [category] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, data.categoryId), eq(categories.userId, user.id)));
  if (!category) throw new Error("Danh mục không tồn tại");

  // Scoped by user, pending-only, and kind-matched in the statement itself, so a
  // foreign id or an already-reviewed row simply matches nothing rather than
  // needing a pre-flight check that could race.
  const updated = await db
    .update(transactions)
    .set({ categoryId: data.categoryId, reviewStatus: "confirmed", updatedAt: new Date() })
    .where(
      and(
        inArray(transactions.id, data.ids),
        eq(transactions.userId, user.id),
        eq(transactions.reviewStatus, "pending"),
        eq(transactions.kind, category.kind),
      ),
    )
    .returning({ id: transactions.id });

  revalidateInboxViews();
  return { changed: updated.length };
}

/**
 * Reverses a bulk categorisation.
 *
 * Restricted to `source = 'bank_sync'` rows so an undo can never strip the
 * category off a manually entered transaction that happened to be in the id list.
 */
export async function undoBulkConfirm(input: { ids: string[] }): Promise<{ reverted: number }> {
  const { user } = await requireSession();
  const data = undoBulkConfirmSchema.parse(input);

  const reverted = await db
    .update(transactions)
    .set({ categoryId: null, reviewStatus: "pending", updatedAt: new Date() })
    .where(
      and(
        inArray(transactions.id, data.ids),
        eq(transactions.userId, user.id),
        eq(transactions.reviewStatus, "confirmed"),
        eq(transactions.source, "bank_sync"),
      ),
    )
    .returning({ id: transactions.id });

  revalidateInboxViews();
  return { reverted: reverted.length };
}

/**
 * Rewrites one incoming + one outgoing pending row as a real transfer pair.
 *
 * Moving money between two linked bank accounts produces two independent
 * webhooks, and cash-flow reporting only excludes `kind = 'transfer'` — so until
 * they are merged those rows are counted as genuine income and genuine spending,
 * inflating both halves of the dashboard hero. Deleting them instead would break
 * the balances, so merging is the only correct repair.
 *
 * Both legs must match in absolute amount exactly. A near-miss is usually a
 * transfer fee, and forcing it through would skew the balance by precisely the
 * difference — breaking the thing this action exists to fix. The UI explains the
 * gap instead of guessing at a fee.
 */
export async function mergeAsTransfer(input: MergeAsTransferInput): Promise<{ pairId: string }> {
  const { user } = await requireSession();
  const data = mergeAsTransferSchema.parse(input);

  if (data.inId === data.outId) throw new Error("Chọn hai giao dịch khác nhau");

  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      kind: transactions.kind,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      note: transactions.note,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.id, [data.inId, data.outId]),
        eq(transactions.userId, user.id),
        eq(transactions.reviewStatus, "pending"),
        eq(transactions.source, "bank_sync"),
      ),
    );

  const incoming = rows.find((r) => r.id === data.inId);
  const outgoing = rows.find((r) => r.id === data.outId);
  if (!incoming || !outgoing) throw new Error("Không tìm thấy hai giao dịch chờ phân loại");
  if (incoming.kind !== "income" || outgoing.kind !== "expense") {
    throw new Error("Cần một giao dịch tiền vào và một giao dịch tiền ra");
  }
  if (incoming.accountId === outgoing.accountId) {
    throw new Error("Hai giao dịch phải ở hai tài khoản khác nhau");
  }

  const amount = Number(incoming.amount);
  if (amount !== Number(outgoing.amount)) {
    throw new Error("Hai giao dịch phải cùng số tiền");
  }

  const dayGap =
    Math.abs(incoming.occurredAt.getTime() - outgoing.occurredAt.getTime()) / 86_400_000;
  if (dayGap > MERGE_MAX_DAY_GAP) {
    throw new Error("Hai giao dịch cách nhau quá xa để ghép");
  }

  // Capture which journal rows point at the two legs BEFORE deleting them —
  // ON DELETE SET NULL is about to blank those pointers, and afterwards there
  // would be no way to tell these events apart from any other detached ones.
  const affectedEvents = await db
    .select({ id: bankSyncEvents.id })
    .from(bankSyncEvents)
    .where(
      and(
        eq(bankSyncEvents.userId, user.id),
        inArray(bankSyncEvents.transactionId, [incoming.id, outgoing.id]),
      ),
    );
  const affectedEventIds = affectedEvents.map((e) => e.id);

  // One transaction: the pending rows disappear and the pair appears together,
  // so a failure can never leave the ledger short by one leg.
  const pairId = await db.transaction(async (tx) => {
    await tx
      .delete(transactions)
      .where(
        and(inArray(transactions.id, [incoming.id, outgoing.id]), eq(transactions.userId, user.id)),
      );

    const outLegId = await writeTransferPair(tx, user.id, {
      fromAccountId: outgoing.accountId,
      toAccountId: incoming.accountId,
      amount,
      occurredAt: outgoing.occurredAt,
      note: outgoing.note ?? incoming.note,
      clientOpId: crypto.randomUUID(),
    });

    // Re-point the journal at the surviving pair. The dedupe key stays on these
    // rows, so a late SePay retry still finds them and will not re-create the
    // legs that were just merged away.
    if (affectedEventIds.length > 0) {
      await tx
        .update(bankSyncEvents)
        .set({ transactionId: outLegId, updatedAt: new Date() })
        .where(
          and(eq(bankSyncEvents.userId, user.id), inArray(bankSyncEvents.id, affectedEventIds)),
        );
    }

    return outLegId;
  });

  revalidateInboxViews();
  return { pairId };
}

// Manual retry for the unmatched banner. Same code path the webhook and the link
// editor use, so a replayed row is indistinguishable from a first delivery.
export async function retryUnmatchedEvents(): Promise<{ imported: number }> {
  const { user } = await requireSession();
  const result = await reprocessUnmatchedEventsCore(db, user.id);
  revalidateInboxViews();
  return { imported: result.imported };
}
