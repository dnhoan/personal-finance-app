import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules } from "@/lib/db/schema";
import { upcomingRenewals } from "@/features/reports/queries";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";

// Regression: the dashboard renewals strip must surface rules with an occurrence
// within the next `days`, computed from the RRULE — not the stored `next_due`
// cursor, which materialisation advances past the 30-day window. Before the fix a
// far-future cursor (the normal post-materialisation state) made the strip empty.
const OWNER_ID = `test-renewals-${Date.now()}`;
const OWNER_EMAIL = `renewals-${Date.now()}@example.test`;
const NOW = new Date("2026-06-10T03:00:00Z");
let accountId: string;

describe("upcomingRenewals", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Renew", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "VCB", type: "bank" })
      .returning({ id: accounts.id });
    accountId = a!.id;

    // Daily rule (always has an occurrence within 7 days) whose stored next_due is
    // already pushed far past the window — exactly the post-materialisation shape.
    const daily = buildRruleString({
      freq: "DAILY",
      interval: 1,
      byWeekday: [],
      byMonthDay: null,
      startDate: "2026-06-01",
    });
    await db.insert(recurringRules).values({
      userId: OWNER_ID,
      accountId,
      kind: "expense",
      amount: "50000",
      rrule: daily,
      nextDue: "2026-07-20", // far beyond NOW + 7d
    });

    // A rule whose next occurrence is well outside the 7-day window must NOT show.
    const monthlyLater = buildRruleString({
      freq: "MONTHLY",
      interval: 1,
      byWeekday: [],
      byMonthDay: 28,
      startDate: "2026-06-28",
    });
    await db.insert(recurringRules).values({
      userId: OWNER_ID,
      accountId,
      kind: "income",
      amount: "9000000",
      rrule: monthlyLater,
      nextDue: "2026-06-28",
    });
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("lists rules with an upcoming occurrence in the window despite an advanced next_due", async () => {
    const renewals = await upcomingRenewals(OWNER_ID, 7, NOW);
    // Only the daily rule has an occurrence in 2026-06-10..2026-06-17.
    expect(renewals).toHaveLength(1);
    expect(renewals[0]!.amount).toBe(50_000);
    // The displayed due date is the recomputed upcoming occurrence (today), not
    // the stored cursor (2026-07-20).
    expect(renewals[0]!.nextDue).toBe("2026-06-10");
  });
});
