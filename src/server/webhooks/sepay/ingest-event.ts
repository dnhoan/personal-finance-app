import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { bankLinks, bankSyncEvents, transactions } from "@/lib/db/schema";
import { parseIctDateTime } from "@/lib/month";
import { resolveBankLink } from "./resolve-bank-link";
import type { SepayWebhookPayload } from "./payload-schema";

// Mirrors bank_sync_events.status. `duplicate` is not a stored status — it is
// what the caller is told when the dedupe key rejected the write.
export type IngestStatus = "imported" | "unmatched" | "skipped_zero_amount" | "duplicate";

export type IngestResult = { status: IngestStatus; transactionId: string | null };

// transactions.note is capped at 500 for hand-entered rows; hold synced rows to
// the same shape so the ledger reads uniformly.
const NOTE_MAX = 500;

function noteFrom(payload: SepayWebhookPayload): string | null {
  const raw = payload.content ?? payload.description ?? null;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed.slice(0, NOTE_MAX);
}

/**
 * Writes the ledger row for an event that matched a bank link, and marks the
 * journal entry imported.
 *
 * Runs as ONE transaction so a row can never exist without its event pointing at
 * it. Shared with the unmatched-event replay path, which must produce byte-identical
 * results to a first-time delivery.
 */
async function writeImportedTransaction(
  database: Db,
  args: {
    eventId: string;
    userId: string;
    accountId: string;
    bankLinkId: string;
    payload: SepayWebhookPayload;
  },
): Promise<string> {
  const { eventId, userId, accountId, bankLinkId, payload } = args;
  const occurredAt = parseIctDateTime(payload.transactionDate);

  return database.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId,
        // No category: assigning one is the user's review action, and its
        // absence is what keeps the row out of category reporting.
        categoryId: null,
        kind: payload.transferType === "in" ? "income" : "expense",
        amount: String(payload.transferAmount),
        occurredAt,
        note: noteFrom(payload),
        merchant: null,
        source: "bank_sync",
        reviewStatus: "pending",
      })
      .returning({ id: transactions.id });

    const transactionId = row!.id;

    await tx
      .update(bankSyncEvents)
      .set({
        transactionId,
        bankLinkId,
        status: "imported",
        updatedAt: new Date(),
      })
      .where(eq(bankSyncEvents.id, eventId));

    // Ordering guard. Retries spread over ~5h, so the retry of event N can commit
    // AFTER event N+1. Without this an older balance overwrites a newer one while
    // last_synced_at makes it look fresh, and the drift check then reports a
    // phantom mismatch — which invites the user to "correct" initial_balance and
    // corrupt their real opening figure. Keyed on the event's own timestamp, never now().
    if (payload.accumulated !== null && payload.accumulated !== undefined) {
      await tx
        .update(bankLinks)
        .set({
          lastBankBalance: String(payload.accumulated),
          lastSyncedAt: occurredAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bankLinks.id, bankLinkId),
            or(isNull(bankLinks.lastSyncedAt), lt(bankLinks.lastSyncedAt, occurredAt)),
          ),
        );
    }

    return transactionId;
  });
}

/**
 * Ingests one validated SePay delivery.
 *
 * The journal row is committed in its OWN transaction, before any business
 * logic. If the ledger insert then fails — bad date, FK violation, timeout — the
 * rollback takes the ledger write but leaves the audit row behind, which is the
 * only thing that makes the delivery recoverable. Dedupe survives too, because
 * the key lives on the journal row rather than on `transactions`: a user who
 * deletes a synced row must not have it resurrected by the next retry.
 */
export async function ingestSepayEvent(
  database: Db,
  userId: string,
  payload: SepayWebhookPayload,
): Promise<IngestResult> {
  const [event] = await database
    .insert(bankSyncEvents)
    .values({
      userId,
      sepayId: payload.id,
      status: "received",
      payload,
    })
    .onConflictDoNothing({ target: [bankSyncEvents.userId, bankSyncEvents.sepayId] })
    .returning({ id: bankSyncEvents.id });

  // No row returned → this exact event was already journalled. Report success so
  // SePay stops retrying, and touch nothing.
  if (!event) return { status: "duplicate", transactionId: null };

  if (payload.transferAmount === 0) {
    // A zero-amount notification is real but has nothing to record. Kept
    // distinguishable from `imported`, whose transaction_id also goes NULL when
    // the user deletes the row.
    await database
      .update(bankSyncEvents)
      .set({ status: "skipped_zero_amount", updatedAt: new Date() })
      .where(eq(bankSyncEvents.id, event.id));
    return { status: "skipped_zero_amount", transactionId: null };
  }

  const link = await resolveBankLink(database, userId, payload.gateway, payload.accountNumber);

  if (!link) {
    // The account number is not mapped yet — commonly one mistyped digit. The
    // event waits here until the user fixes the link, which replays it.
    await database
      .update(bankSyncEvents)
      .set({ status: "unmatched", updatedAt: new Date() })
      .where(eq(bankSyncEvents.id, event.id));
    return { status: "unmatched", transactionId: null };
  }

  const transactionId = await writeImportedTransaction(database, {
    eventId: event.id,
    userId,
    accountId: link.accountId,
    bankLinkId: link.id,
    payload,
  });

  return { status: "imported", transactionId };
}

export { writeImportedTransaction };
