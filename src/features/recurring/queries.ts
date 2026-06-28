import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recurringRules, accounts, categories } from "@/lib/db/schema";
import {
  nextOccurrences,
  occurrencesBetween,
  anchorToVnDate,
  describeRrule,
} from "./lib/rrule-builder";

export type RecurringRuleItem = {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  kind: "income" | "expense";
  amount: number;
  note: string | null;
  rrule: string;
  leadDays: number;
  active: boolean;
  /** "YYYY-MM-DD" */
  nextDue: string;
  /** Vietnamese human description, e.g. "Hàng tháng · ngày 1". */
  description: string;
  /** Next 3 occurrence dates "YYYY-MM-DD". */
  nextDates: string[];
  /** Next due falls within the rule's alert lead window. */
  dueSoon: boolean;
};

export type RecurringSummary = {
  /** Signed 30-day projection (income positive, expense negative). */
  net30: number;
  income30: number;
  expense30: number;
  activeCount: number;
  pausedCount: number;
  dueSoonCount: number;
};

const LEAD_WINDOW_DAYS = 30;

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function ictDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// All rules for the user (active first, soonest due first) with joined account +
// category, plus per-rule next-3-dates / description and the 30-day projection
// summary. RRULE expansion is bounded to the 30-day window / 3 occurrences.
export async function listRecurringRules(
  userId: string,
  now: Date = new Date(),
): Promise<{ rules: RecurringRuleItem[]; summary: RecurringSummary }> {
  const rows = await db
    .select({
      id: recurringRules.id,
      accountId: recurringRules.accountId,
      accountName: accounts.name,
      categoryId: recurringRules.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      kind: recurringRules.kind,
      amount: recurringRules.amount,
      note: recurringRules.note,
      rrule: recurringRules.rrule,
      leadDays: recurringRules.leadDays,
      active: recurringRules.active,
      nextDue: recurringRules.nextDue,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(eq(recurringRules.userId, userId))
    .orderBy(desc(recurringRules.active), asc(recurringRules.nextDue));

  const windowEnd = addDays(now, LEAD_WINDOW_DAYS);

  let income30 = 0;
  let expense30 = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let dueSoonCount = 0;

  const rules: RecurringRuleItem[] = rows.map((r) => {
    const amount = Number(r.amount);
    const kind = r.kind as "income" | "expense";
    // "Due soon" must reflect the soonest *upcoming* occurrence, not the stored
    // `nextDue` cursor: materialisation advances `nextDue` past the 30-day lead
    // window after pre-creating instances, so it is always far in the future and
    // could never satisfy a leadDays (~3) cutoff. Recompute from the rrule.
    const nextDates = nextOccurrences(r.rrule, 3, now).map(anchorToVnDate);
    const dueSoonCutoff = ictDate(addDays(now, r.leadDays));
    const upcoming = nextDates[0];
    const dueSoon = r.active && upcoming != null && upcoming <= dueSoonCutoff;

    if (r.active) {
      activeCount++;
      if (dueSoon) dueSoonCount++;
      const occ = occurrencesBetween(r.rrule, now, windowEnd).length;
      if (kind === "income") income30 += occ * amount;
      else expense30 += occ * amount;
    } else {
      pausedCount++;
    }

    return {
      id: r.id,
      accountId: r.accountId,
      accountName: r.accountName,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryIcon: r.categoryIcon,
      categoryColor: r.categoryColor,
      kind,
      amount,
      note: r.note,
      rrule: r.rrule,
      leadDays: r.leadDays,
      active: r.active,
      nextDue: r.nextDue,
      description: describeRrule(r.rrule),
      nextDates,
      dueSoon,
    };
  });

  return {
    rules,
    summary: {
      net30: income30 - expense30,
      income30,
      expense30,
      activeCount,
      pausedCount,
      dueSoonCount,
    },
  };
}
