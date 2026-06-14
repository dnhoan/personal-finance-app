import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, categories, transactions } from "@/lib/db/schema";
import { monthStartDate } from "@/lib/month";

// The budget "spent" query filters transactions by the `occurred_month_ict`
// generated column against monthStartDate(monthKey). This verifies the ICT month
// boundary that mapping depends on: a tx at 2026-06-01 06:30 ICT (= 2026-05-31
// 23:30 UTC) must count toward JUNE budgets, not May.
const OWNER_ID = `test-budtz-${Date.now()}`;
const OWNER_EMAIL = `budtz-${Date.now()}@example.test`;
let accountId: string;
let categoryId: string;

// Mirrors the exact filter listBudgets uses for a category's monthly spend.
async function spentForMonth(monthKey: string): Promise<number> {
  const rows = await db.execute<{ spent: string }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS spent
    FROM transactions
    WHERE user_id = ${OWNER_ID}
      AND kind = 'expense'
      AND category_id = ${categoryId}
      AND occurred_month_ict = ${monthStartDate(monthKey)}
  `);
  return Number(rows.rows[0]?.spent ?? 0);
}

describe("budget spent — ICT month boundary", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "BudTZ", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ví", type: "cash" })
      .returning({ id: accounts.id });
    accountId = a!.id;
    const [c] = await db
      .insert(categories)
      .values({ userId: OWNER_ID, name: "Ăn uống", slug: "an-uong", kind: "expense" })
      .returning({ id: categories.id });
    categoryId = c!.id;

    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId,
      categoryId,
      kind: "expense",
      amount: "200000",
      occurredAt: new Date("2026-05-31T23:30:00Z"), // 2026-06-01 06:30 ICT
    });
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("counts the boundary tx toward June, not May", async () => {
    expect(await spentForMonth("2026-06")).toBe(200_000);
    expect(await spentForMonth("2026-05")).toBe(0);
  });
});
