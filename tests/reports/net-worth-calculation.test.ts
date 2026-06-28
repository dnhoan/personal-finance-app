import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { insertTransferAtomic } from "@/features/transactions/repository";
import { netWorthSnapshot } from "@/features/reports/queries";
import { listAccountsWithBalance } from "@/features/accounts/queries";

// Validates net worth via the Phase 7 balance convention: assets sum positively,
// a debt's outstanding amount subtracts, and a transfer between own accounts
// leaves net worth unchanged while shifting the two account balances. Live Neon.
const OWNER_ID = `test-networth-${Date.now()}`;
const OWNER_EMAIL = `networth-${Date.now()}@example.test`;

describe("netWorthSnapshot", () => {
  let cashId: string;
  let bankId: string;
  let debtId: string;

  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "NetWorth", email: OWNER_EMAIL, emailVerified: true });
    const [c] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Tiền mặt", type: "cash", initialBalance: "5000000" })
      .returning({ id: accounts.id });
    cashId = c!.id;
    const [b] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ngân hàng", type: "bank", initialBalance: "10000000" })
      .returning({ id: accounts.id });
    bankId = b!.id;
    const [d] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Vay", type: "debt", initialBalance: "4000000" })
      .returning({ id: accounts.id });
    debtId = d!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  async function balanceOf(id: string): Promise<number> {
    const rows = await listAccountsWithBalance(OWNER_ID);
    return rows.find((a) => a.id === id)!.balance;
  }

  it("nets assets minus outstanding debt, before and after a tx", async () => {
    // Opening: assets 5M + 10M = 15M; debt owed 4M → net 11M.
    let snap = await netWorthSnapshot(OWNER_ID);
    expect(snap.assets).toBe(15_000_000);
    expect(snap.liabilities).toBe(-4_000_000);
    expect(snap.net).toBe(11_000_000);

    // Spend 1M cash; pay 1M off the debt (debt counts down).
    await db.insert(transactions).values([
      {
        userId: OWNER_ID,
        accountId: cashId,
        kind: "expense",
        amount: "1000000",
        occurredAt: new Date("2026-06-10T05:00:00Z"),
      },
      {
        userId: OWNER_ID,
        accountId: debtId,
        kind: "expense",
        amount: "1000000",
        occurredAt: new Date("2026-06-11T05:00:00Z"),
      },
    ]);

    snap = await netWorthSnapshot(OWNER_ID);
    // cash 4M + bank 10M = 14M assets; debt remaining 3M → net 11M.
    expect(snap.assets).toBe(14_000_000);
    expect(snap.liabilities).toBe(-3_000_000);
    expect(snap.net).toBe(11_000_000);
  });

  it("a transfer shifts account balances but leaves net worth unchanged", async () => {
    const before = await netWorthSnapshot(OWNER_ID);
    const cashBefore = await balanceOf(cashId);
    const bankBefore = await balanceOf(bankId);

    await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 2_000_000,
      occurredAt: new Date("2026-06-12T05:00:00Z"),
      note: null,
      clientOpId: crypto.randomUUID(),
    });

    expect(await balanceOf(cashId)).toBe(cashBefore - 2_000_000);
    expect(await balanceOf(bankId)).toBe(bankBefore + 2_000_000);
    expect((await netWorthSnapshot(OWNER_ID)).net).toBe(before.net);
  });
});
