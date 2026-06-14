import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules, transactions } from "@/lib/db/schema";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";

// Two materialisations firing at once for the same user/rule (page load racing
// the cron) must not double-insert. The per-rule advisory xact lock serialises
// them; the loser re-reads the advanced cursor and inserts nothing.
const OWNER_ID = `test-recur-conc-${Date.now()}`;
const OWNER_EMAIL = `recur-conc-${Date.now()}@example.test`;
const NOW = new Date("2026-01-15T00:00:00Z");
let accountId: string;
let ruleId: string;

describe("materialiseDueInstances concurrency", () => {
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

  it("creates each instance exactly once under parallel calls", async () => {
    const [a, b] = await Promise.all([
      materialiseDueInstances(db, OWNER_ID, NOW),
      materialiseDueInstances(db, OWNER_ID, NOW),
    ]);
    // Combined inserts equal the unique occurrence count — no duplicates.
    expect(a + b).toBe(2);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.recurringRuleId, ruleId));
    expect(rows).toHaveLength(2);
  });
});
