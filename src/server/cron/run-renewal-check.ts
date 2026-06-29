import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { recurringRules, categories } from "@/lib/db/schema";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { nextOccurrences, anchorToVnDate } from "@/features/recurring/lib/rrule-builder";
import { formatRenewalMessage } from "./lib/format-renewal-message";
import { sendMail as defaultSendMail } from "@/lib/mailer";

export type RenewalCheckResult = {
  processed: number;
  sent: number;
  claimed_but_failed: number;
};

// Today's VN calendar date as "YYYY-MM-DD" — the idempotency key. The lead window
// and notification cutoff are all expressed in VN days.
function ictDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

// Whole-day difference between two "YYYY-MM-DD" strings (due − today). Parsed as
// UTC midnight on both sides, so the subtraction is drift-free.
function daysBetween(today: string, due: string): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${due}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Daily renewal alert pass for the single owner.
 *
 * Materialises first (defensive), then for each active rule recomputes the soonest
 * UPCOMING occurrence from the rrule — never the stored `next_due`, which
 * materialisation advances ~30 days past the lead window (same reason the
 * dashboard recomputes due-soon from the rrule). A rule is alerted when that
 * occurrence is within its `lead_days` window and it has not been notified today.
 *
 * Each due rule is claimed with a conditional `notified_at` UPDATE *before*
 * sending, so a retry after a send failure cannot duplicate the alert — a rare
 * missed alert is preferred over a duplicate. Each claim runs in its own
 * transaction; one bad send never blocks the rest. A heartbeat UPSERT records the
 * run regardless of how many sent.
 */
export async function runRenewalCheck(
  database: Db,
  userId: string,
  now: Date = new Date(),
  sendMail: typeof defaultSendMail = defaultSendMail,
): Promise<RenewalCheckResult> {
  await materialiseDueInstances(database, userId, now);

  const today = ictDate(now);

  const activeRules = await database
    .select({
      id: recurringRules.id,
      amount: recurringRules.amount,
      note: recurringRules.note,
      rrule: recurringRules.rrule,
      leadDays: recurringRules.leadDays,
      notifiedAt: recurringRules.notifiedAt,
      categoryName: categories.name,
    })
    .from(recurringRules)
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.active, true)));

  let sent = 0;
  let claimedButFailed = 0;
  let processed = 0;

  for (const rule of activeRules) {
    // Already alerted today? Skip without recomputing (cheap idempotency gate).
    if (rule.notifiedAt != null && rule.notifiedAt >= today) continue;

    // Soonest upcoming occurrence (VN date) — recomputed from the rrule, not the
    // advanced `next_due` cursor.
    const upcoming = nextOccurrences(rule.rrule, 1, now).map(anchorToVnDate)[0];
    if (upcoming == null) continue;

    const cutoff = ictDate(addDays(now, rule.leadDays));
    if (upcoming > cutoff) continue; // not within the lead window yet

    processed++;

    // Conditional claim: only one runner wins per day. rowCount 0 → already claimed.
    const claimed = await database.transaction(async (tx) => {
      const res = await tx
        .update(recurringRules)
        .set({ notifiedAt: today, updatedAt: now })
        .where(
          and(
            eq(recurringRules.id, rule.id),
            or(
              isNull(recurringRules.notifiedAt),
              sql`${recurringRules.notifiedAt} < ${today}::date`,
            ),
          ),
        )
        .returning({ id: recurringRules.id });
      return res.length > 0;
    });

    if (!claimed) continue; // another runner already claimed this rule today

    const daysUntil = daysBetween(today, upcoming);
    const { subject, html } = formatRenewalMessage(
      {
        amount: Number(rule.amount),
        note: rule.note,
        categoryName: rule.categoryName,
        nextDue: upcoming,
      },
      daysUntil,
    );

    try {
      await sendMail({ subject, html });
      sent++;
      console.info(`[alert] rule=${rule.id} next_due=${upcoming} status=sent`);
    } catch (err) {
      // Leave notified_at set (accept rare missed alert over duplicate) and move on.
      claimedButFailed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[alert] rule=${rule.id} next_due=${upcoming} status=failed err=${message}`);
    }
  }

  // Heartbeat. UPSERT (not bare UPDATE) so it lands even if the singleton row was
  // never seeded. The dashboard reads this to surface a silently-broken cron.
  await database.execute(sql`
    INSERT INTO cron_state (id, last_renewal_check_at)
    VALUES (true, now())
    ON CONFLICT (id) DO UPDATE SET last_renewal_check_at = now()
  `);

  return { processed, sent, claimed_but_failed: claimedButFailed };
}
