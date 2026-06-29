import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, recurringRules } from "@/lib/db/schema";
import { buildRruleString } from "@/features/recurring/lib/rrule-builder";
import { runRenewalCheck } from "@/server/cron/run-renewal-check";

// Runs against a live Neon branch. A DAILY rule has an occurrence inside the
// 3-day lead window every day, so the alert fires; running twice the same day
// must send exactly once (notified_at idempotency) and bump the heartbeat both
// times. sendMail is mocked so no real email is sent.
const OWNER_ID = `test-renewal-${Date.now()}`;
const OWNER_EMAIL = `renewal-${Date.now()}@example.test`;
const NOW = new Date("2026-03-10T03:00:00Z"); // ~10:00 ICT
const TODAY_ICT = "2026-03-10";
let accountId: string;
let ruleId: string;

async function heartbeat(): Promise<string | null> {
  const r = await db.execute<{ last_renewal_check_at: string | null }>(
    sql`SELECT last_renewal_check_at FROM cron_state LIMIT 1`,
  );
  return r.rows[0]?.last_renewal_check_at ?? null;
}

describe("runRenewalCheck idempotency + heartbeat", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Renewal", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "VCB", type: "bank" })
      .returning({ id: accounts.id });
    accountId = a!.id;

    // DAILY from the day before NOW → soonest upcoming occurrence is within lead.
    const rrule = buildRruleString({
      freq: "DAILY",
      interval: 1,
      byWeekday: [],
      byMonthDay: null,
      startDate: "2026-03-09",
    });
    const [r] = await db
      .insert(recurringRules)
      .values({
        userId: OWNER_ID,
        accountId,
        kind: "expense",
        amount: "120000",
        note: "Internet",
        rrule,
        nextDue: "2026-03-09",
      })
      .returning({ id: recurringRules.id });
    ruleId = r!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("sends once across two same-day runs and updates the heartbeat each run", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);

    const first = await runRenewalCheck(db, OWNER_ID, NOW, sendMail);
    expect(first.sent).toBe(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const hb1 = await heartbeat();
    expect(hb1).not.toBeNull();

    const [afterFirst] = await db
      .select({ notifiedAt: recurringRules.notifiedAt })
      .from(recurringRules)
      .where(eq(recurringRules.id, ruleId));
    expect(afterFirst!.notifiedAt).toBe(TODAY_ICT);

    const second = await runRenewalCheck(db, OWNER_ID, NOW, sendMail);
    expect(second.sent).toBe(0);
    expect(sendMail).toHaveBeenCalledTimes(1); // still once — idempotent
    const hb2 = await heartbeat();
    expect(hb2).not.toBeNull();
    expect(new Date(hb2!).getTime()).toBeGreaterThanOrEqual(new Date(hb1!).getTime());
  });
});
