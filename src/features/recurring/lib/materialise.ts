import { and, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { recurringRules, transactions } from "@/lib/db/schema";
import {
  occurrencesBetween,
  ruleDtstart,
  vnDateToAnchor,
  anchorToVnDate,
  firstDueDate,
} from "./rrule-builder";

// Lazy materialisation: turn due recurring-rule occurrences into real transaction
// rows. Called before reading /recurring, /transactions, and by the Phase 9 cron.
//
// No "server-only" guard on purpose (like the transactions repository) so the
// idempotency + advisory-lock behaviour can be exercised directly by integration
// tests against a Neon branch.

const LEAD_WINDOW_DAYS = 30;

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

// VN calendar date of an arbitrary instant (the lead window is expressed in VN days).
function ictDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Generate transaction rows for every active rule occurrence due within the
 * 30-day lead window. Returns the number of rows inserted.
 *
 * Idempotent: the partial unique index on (recurring_rule_id, occurred_at)
 * absorbs duplicates, so a second pass inserts nothing.
 *
 * Concurrency-safe: each rule is processed in its own transaction holding a
 * per-rule advisory xact lock, so the page load and cron (or a concurrent
 * edit-series) serialise instead of racing. After acquiring the lock the rule is
 * re-read inside the transaction, so a caller that lost the race sees the
 * already-advanced cursor and does no duplicate work.
 */
export async function materialiseDueInstances(
  database: Db,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const windowEndYmd = ictDate(addDays(now, LEAD_WINDOW_DAYS));
  const windowEndAnchor = vnDateToAnchor(windowEndYmd);

  // Cheap candidate scan; the authoritative read happens under the lock below.
  const candidates = await database
    .select({ id: recurringRules.id })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        lte(recurringRules.nextDue, windowEndYmd),
      ),
    );

  let inserted = 0;
  for (const { id } of candidates) {
    inserted += await materialiseRule(database, userId, id, windowEndYmd, windowEndAnchor);
  }
  return inserted;
}

async function materialiseRule(
  database: Db,
  userId: string,
  ruleId: string,
  windowEndYmd: string,
  windowEndAnchor: Date,
): Promise<number> {
  return database.transaction(async (tx) => {
    // Serialise vs. any concurrent materialise/edit-series for this rule.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`rule:${ruleId}`}))`);

    const [rule] = await tx
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.id, ruleId),
          eq(recurringRules.userId, userId),
          eq(recurringRules.active, true),
        ),
      );
    if (!rule) return 0;

    const windowStart = rule.lastMaterialisedAt
      ? vnDateToAnchor(rule.lastMaterialisedAt)
      : ruleDtstart(rule.rrule);
    const occurrences = occurrencesBetween(rule.rrule, windowStart, windowEndAnchor);

    let count = 0;
    if (occurrences.length > 0) {
      const rows = await tx
        .insert(transactions)
        .values(
          occurrences.map((when) => ({
            userId,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            kind: rule.kind,
            amount: rule.amount,
            occurredAt: when,
            note: rule.note,
            recurringRuleId: rule.id,
          })),
        )
        .onConflictDoNothing({
          target: [transactions.recurringRuleId, transactions.occurredAt],
          where: sql`recurring_rule_id is not null`,
        })
        .returning({ id: transactions.id });
      count = rows.length;
    }

    // Advance the cursor + next-due pointer so the same instances never re-create.
    const next = firstDueDate(rule.rrule, windowEndAnchor, false);
    await tx
      .update(recurringRules)
      .set({
        lastMaterialisedAt: windowEndYmd,
        nextDue: next ? anchorToVnDate(next) : windowEndYmd,
        active: next != null, // rule with no further occurrences is complete
        updatedAt: new Date(),
      })
      .where(eq(recurringRules.id, rule.id));

    return count;
  });
}
