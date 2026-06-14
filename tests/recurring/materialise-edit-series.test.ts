import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules, transactions } from "@/lib/db/schema";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";

// Edit-series semantics: changing a rule's fields affects only occurrences
// materialised AFTER the edit. Already-materialised rows are historical record
// and keep their original values.
const OWNER_ID = `test-recur-series-${Date.now()}`;
const OWNER_EMAIL = `recur-series-${Date.now()}@example.test`;
let accountId: string;
let ruleId: string;

describe("materialiseDueInstances edit-series", () => {
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
      freq: "MONTHLY",
      interval: 1,
      byWeekday: [],
      byMonthDay: 1,
      startDate: "2026-01-01",
    });
    const [r] = await db
      .insert(recurringRules)
      .values({
        userId: OWNER_ID,
        accountId,
        kind: "expense",
        amount: "100000",
        rrule,
        nextDue: "2026-01-01",
      })
      .returning({ id: recurringRules.id });
    ruleId = r!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("applies new fields only to future materialisations", async () => {
    // First window (Jan–early Feb): two rows at the original amount.
    await materialiseDueInstances(db, OWNER_ID, new Date("2026-01-05T00:00:00Z"));

    // Edit series: bump the amount. The cursor (lastMaterialisedAt) stays put.
    await db.update(recurringRules).set({ amount: "200000" }).where(eq(recurringRules.id, ruleId));

    // Later window picks up only the not-yet-materialised occurrences.
    await materialiseDueInstances(db, OWNER_ID, new Date("2026-03-05T00:00:00Z"));

    const rows = await db
      .select({ amount: transactions.amount, occurredAt: transactions.occurredAt })
      .from(transactions)
      .where(eq(transactions.recurringRuleId, ruleId))
      .orderBy(asc(transactions.occurredAt));

    const amounts = rows.map((r) => r.amount);
    // 2026-01-01 + 2026-02-01 at 100000, then 2026-03-01 + 2026-04-01 at 200000.
    expect(amounts).toEqual(["100000", "100000", "200000", "200000"]);
  });
});
