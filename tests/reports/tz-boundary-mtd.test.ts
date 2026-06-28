import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";

// Guards the MTD month-boundary invariant: a transaction at 2026-05-31 23:30 UTC
// is 2026-06-01 06:30 in Asia/Ho_Chi_Minh, so it must bucket into JUNE — the
// generated `occurred_month_ict` column is what every report/budget query filters
// on, so this proves the hero metric attributes the tx to the right month. Live Neon.
const OWNER_ID = `test-tzmtd-${Date.now()}`;
const OWNER_EMAIL = `tzmtd-${Date.now()}@example.test`;

describe("occurred_month_ict boundary for MTD", () => {
  let cashId: string;
  let txId: string;

  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "TzMtd", email: OWNER_EMAIL, emailVerified: true });
    const [c] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Tiền mặt", type: "cash" })
      .returning({ id: accounts.id });
    cashId = c!.id;
    // 2026-05-31 23:30 UTC → 2026-06-01 06:30 ICT.
    const [t] = await db
      .insert(transactions)
      .values({
        userId: OWNER_ID,
        accountId: cashId,
        kind: "income",
        amount: "1500000",
        occurredAt: new Date("2026-05-31T23:30:00Z"),
      })
      .returning({ id: transactions.id });
    txId = t!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("buckets the late-UTC-May tx into ICT June, not May", async () => {
    const rows = await db.execute<{ month: string }>(sql`
      SELECT occurred_month_ict::text AS month
      FROM transactions WHERE id = ${txId}
    `);
    expect(rows.rows[0]?.month).toBe("2026-06-01");
  });

  it("a hypothetical MTD filter on 2026-06 includes the tx", async () => {
    // Mirrors netCashFlowMtd's filter with a pinned month (the live query uses
    // now()); proves the generated column is what makes June MTD include it.
    const rows = await db.execute<{ income: string }>(sql`
      SELECT COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0)::text AS income
      FROM transactions
      WHERE user_id = ${OWNER_ID}
        AND kind <> 'transfer'
        AND occurred_month_ict = '2026-06-01'::date
    `);
    expect(Number(rows.rows[0]?.income)).toBe(1_500_000);
  });
});
