import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { insertTransferAtomic } from "@/features/transactions/repository";
import { netCashFlowMtd } from "@/features/reports/queries";

// Verifies the hero metric counts income − expense for the current ICT month and
// that a transfer (both signed legs, kind='transfer') is excluded — moving money
// between own accounts is neither a gain nor a loss. Runs against a live Neon branch.
const OWNER_ID = `test-cashflow-${Date.now()}`;
const OWNER_EMAIL = `cashflow-${Date.now()}@example.test`;

// A timestamp inside the current ICT month so occurred_month_ict matches "now".
const thisMonthAt = (day: number) => {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}-${String(day).padStart(2, "0")}T05:00:00Z`);
};

describe("netCashFlowMtd excludes transfers", () => {
  let cashId: string;
  let bankId: string;

  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "CashFlow", email: OWNER_EMAIL, emailVerified: true });
    const [c] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Tiền mặt", type: "cash" })
      .returning({ id: accounts.id });
    cashId = c!.id;
    const [b] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ngân hàng", type: "bank" })
      .returning({ id: accounts.id });
    bankId = b!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("nets income minus expense, then is unchanged by a transfer", async () => {
    await db.insert(transactions).values([
      {
        userId: OWNER_ID,
        accountId: cashId,
        kind: "income",
        amount: "10000000",
        occurredAt: thisMonthAt(2),
      },
      {
        userId: OWNER_ID,
        accountId: cashId,
        kind: "expense",
        amount: "3000000",
        occurredAt: thisMonthAt(3),
      },
    ]);

    const before = await netCashFlowMtd(OWNER_ID);
    expect(before).toEqual({ income: 10_000_000, expense: 3_000_000, net: 7_000_000 });

    // 2M cash → bank. Both legs are kind='transfer' and must not move the hero.
    await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 2_000_000,
      occurredAt: thisMonthAt(4),
      note: null,
      clientOpId: crypto.randomUUID(),
    });

    const after = await netCashFlowMtd(OWNER_ID);
    expect(after).toEqual(before);
  });
});
