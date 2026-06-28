import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules } from "@/lib/db/schema";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { listRecurringRules } from "@/features/recurring/queries";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";

// Regression: dueSoonCount must count rules whose next *upcoming* occurrence
// falls within the leadDays window — even after materialisation has advanced the
// stored `nextDue` cursor past the 30-day lead window. Before the fix the count
// was always 0 because dueSoon was derived from the post-materialisation cursor.
const OWNER_ID = `test-recur-duesoon-${Date.now()}`;
const OWNER_EMAIL = `recur-duesoon-${Date.now()}@example.test`;
// Daily rule so an occurrence always lands inside the default 3-day lead window.
const NOW = new Date("2026-06-10T03:00:00Z");
let accountId: string;
let ruleId: string;

describe("listRecurringRules dueSoonCount", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Recur", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "VCB", type: "bank" })
      .returning({ id: accounts.id });
    accountId = a!.id;

    const rrule = buildRruleString({
      freq: "DAILY",
      interval: 1,
      byWeekday: [],
      byMonthDay: null,
      startDate: "2026-06-01",
    });
    const [r] = await db
      .insert(recurringRules)
      .values({
        userId: OWNER_ID,
        accountId,
        kind: "expense",
        amount: "50000",
        rrule,
        nextDue: "2026-06-01",
        leadDays: 3,
      })
      .returning({ id: recurringRules.id });
    ruleId = r!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("counts due-soon rules after materialisation advances nextDue past the window", async () => {
    // Materialise first (mirrors the page), which pushes the stored nextDue cursor
    // well beyond the 30-day window.
    await materialiseDueInstances(db, OWNER_ID, NOW);

    const [advanced] = await db
      .select({ next: recurringRules.nextDue })
      .from(recurringRules)
      .where(eq(recurringRules.id, ruleId));
    // Cursor is now far in the future (> lead window) — the old bug source.
    expect(advanced!.next > "2026-06-13").toBe(true);

    const { summary } = await listRecurringRules(OWNER_ID, NOW);
    // A daily rule always has an occurrence within the next 3 days.
    expect(summary.dueSoonCount).toBe(1);
  });
});
