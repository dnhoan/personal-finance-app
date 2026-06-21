import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { listAccountsWithBalance } from "@/features/accounts/queries";

// Verifies the debt/receivable balance convention: `balance` is the OUTSTANDING
// amount (initial − settled), counting down toward 0, so net worth sees the
// correct sign. Runs against a live Neon branch.
const OWNER_ID = `test-debtbal-${Date.now()}`;
const OWNER_EMAIL = `debtbal-${Date.now()}@example.test`;

describe("debt/receivable account balance", () => {
  let debtId: string;
  let receivableId: string;

  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "DebtBal", email: OWNER_EMAIL, emailVerified: true });
    const [d] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Vay từ Mẹ", type: "debt", initialBalance: "5000000" })
      .returning({ id: accounts.id });
    debtId = d!.id;
    const [r] = await db
      .insert(accounts)
      .values({
        userId: OWNER_ID,
        name: "Cho Hùng vay",
        type: "receivable",
        initialBalance: "800000",
      })
      .returning({ id: accounts.id });
    receivableId = r!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  async function balanceOf(id: string): Promise<number> {
    const rows = await listAccountsWithBalance(OWNER_ID);
    return rows.find((a) => a.id === id)!.balance;
  }

  it("debt starts at full amount owed, then counts down with expense payments", async () => {
    expect(await balanceOf(debtId)).toBe(5_000_000); // nothing paid yet

    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: debtId,
      kind: "expense",
      amount: "2000000",
      occurredAt: new Date("2026-06-15T05:00:00Z"),
    });
    expect(await balanceOf(debtId)).toBe(3_000_000); // remaining owed
  });

  it("receivable counts down with income collections", async () => {
    expect(await balanceOf(receivableId)).toBe(800_000); // nothing collected yet

    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: receivableId,
      kind: "income",
      amount: "300000",
      occurredAt: new Date("2026-06-16T05:00:00Z"),
    });
    expect(await balanceOf(receivableId)).toBe(500_000); // remaining to collect
  });
});
