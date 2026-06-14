import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules, transactions } from "@/lib/db/schema";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";

// Materialisation runs against a live Neon branch. A second pass must add nothing
// (partial unique index absorbs duplicates) and the cursor must advance once.
const OWNER_ID = `test-recur-idem-${Date.now()}`;
const OWNER_EMAIL = `recur-idem-${Date.now()}@example.test`;
const NOW = new Date("2026-01-15T00:00:00Z");
let accountId: string;
let ruleId: string;

describe("materialiseDueInstances idempotency", () => {
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

  it("inserts due instances once and is a no-op on re-run", async () => {
    const first = await materialiseDueInstances(db, OWNER_ID, NOW);
    expect(first).toBe(2); // 2026-01-01 + 2026-02-01 within the 30-day window

    const second = await materialiseDueInstances(db, OWNER_ID, NOW);
    expect(second).toBe(0);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.recurringRuleId, ruleId));
    expect(rows).toHaveLength(2);

    const [rule] = await db
      .select({ last: recurringRules.lastMaterialisedAt, next: recurringRules.nextDue })
      .from(recurringRules)
      .where(eq(recurringRules.id, ruleId));
    expect(rule!.last).toBe("2026-02-14");
    expect(rule!.next).toBe("2026-03-01");
  });
});
