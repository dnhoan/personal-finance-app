import { and, lt, ne } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { bankSyncEvents } from "@/lib/db/schema";

// Webhook payloads carry transfer descriptions — personal data — and signup is
// open, so every registered user can write into this table. Ninety days is long
// enough to settle a balance dispute and short enough that the journal is not an
// indefinite store.
export const BANK_SYNC_EVENT_RETENTION_DAYS = 90;

/**
 * Drops webhook journal rows past the retention window.
 *
 * `unmatched` rows are exempt: they are still queued work (no bank_link existed
 * when they arrived) and `reprocessUnmatchedEvents` replays them once the user
 * links the account. Ageing those out would silently discard transactions the
 * user never saw.
 *
 * Runs once per cron fire, not once per user — retention is global and does not
 * depend on who owns the row.
 */
export async function pruneBankSyncEvents(
  database: Db,
  now: Date = new Date(),
): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - BANK_SYNC_EVENT_RETENTION_DAYS * 86_400_000);
  const deleted = await database
    .delete(bankSyncEvents)
    .where(and(lt(bankSyncEvents.receivedAt, cutoff), ne(bankSyncEvents.status, "unmatched")))
    .returning({ id: bankSyncEvents.id });
  return { deleted: deleted.length };
}
