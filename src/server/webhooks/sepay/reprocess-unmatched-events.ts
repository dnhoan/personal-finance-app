import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { bankSyncEvents } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { sepayWebhookSchema } from "./payload-schema";
import { resolveBankLink } from "./resolve-bank-link";
import { writeImportedTransaction } from "./ingest-event";

/**
 * Replays journalled deliveries that had no matching bank link when they arrived.
 *
 * This is the recovery path that makes answering 200 to an unmatched delivery
 * honest. SePay considers a 2xx final and never resends, so without a replay the
 * most ordinary setup mistake — one wrong digit in an account number — would
 * silently destroy every transaction that arrived before it was noticed.
 *
 * Called after a bank link is created or re-pointed. Each event is handled
 * independently: one bad payload must not strand the rest.
 */
export async function reprocessUnmatchedEvents(
  database: Db,
  userId: string,
): Promise<{ imported: number; stillUnmatched: number; invalid: number }> {
  const pending = await database
    .select({ id: bankSyncEvents.id, payload: bankSyncEvents.payload })
    .from(bankSyncEvents)
    .where(and(eq(bankSyncEvents.userId, userId), eq(bankSyncEvents.status, "unmatched")));

  let imported = 0;
  let stillUnmatched = 0;
  let invalid = 0;

  for (const event of pending) {
    // Re-validated rather than trusted: the row was stored as jsonb and this
    // path feeds the ledger writer directly.
    const parsed = sepayWebhookSchema.safeParse(event.payload);
    if (!parsed.success) {
      invalid++;
      logger.warn("webhook", "unmatched event has unparseable payload", { eventId: event.id });
      continue;
    }

    const link = await resolveBankLink(
      database,
      userId,
      parsed.data.gateway,
      parsed.data.accountNumber,
    );
    if (!link) {
      stillUnmatched++;
      continue;
    }

    try {
      await writeImportedTransaction(database, {
        eventId: event.id,
        userId,
        accountId: link.accountId,
        bankLinkId: link.id,
        payload: parsed.data,
      });
      imported++;
    } catch (err) {
      // Leave the row `unmatched` so the next link edit retries it.
      stillUnmatched++;
      logger.error("webhook", "failed to replay unmatched event", {
        eventId: event.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (imported > 0) {
    logger.info("webhook", "replayed unmatched events", { userId, imported });
  }
  return { imported, stillUnmatched, invalid };
}
