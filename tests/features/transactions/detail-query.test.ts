import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, categories, goals, transactions } from "@/lib/db/schema";
import { getTransactionDetail } from "@/features/transactions/queries";

// Read-path detail query, against a live Neon branch:
//  - an owned tx returns its full detail (fields + goal name),
//  - an unknown or non-owned id returns null (ownership, no leak),
//  - a transfer leg resolves source/destination accounts by leg sign.
const stamp = Date.now();
const A_ID = `test-detail-a-${stamp}`;
const B_ID = `test-detail-b-${stamp}`;

let aChecking: string;
let aSavings: string;
let aCategory: string;
let aGoal: string;
let incomeTxId: string;
let bTxId: string;
let transferOutId: string;
let transferInId: string;

describe("getTransactionDetail", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: A_ID, name: "A", email: `detail-a-${stamp}@example.test`, emailVerified: true },
      { id: B_ID, name: "B", email: `detail-b-${stamp}@example.test`, emailVerified: true },
    ]);
    const [checking] = await db
      .insert(accounts)
      .values({ userId: A_ID, name: "A ngân hàng", type: "bank" })
      .returning({ id: accounts.id });
    const [savings] = await db
      .insert(accounts)
      .values({ userId: A_ID, name: "A tiết kiệm", type: "bank" })
      .returning({ id: accounts.id });
    const [bAcc] = await db
      .insert(accounts)
      .values({ userId: B_ID, name: "B ví", type: "cash" })
      .returning({ id: accounts.id });
    const [cat] = await db
      .insert(categories)
      .values({ userId: A_ID, name: "Lương", slug: `luong-${stamp}`, kind: "income" })
      .returning({ id: categories.id });
    const [goal] = await db
      .insert(goals)
      .values({ userId: A_ID, name: "Quỹ khẩn cấp", targetAmount: "10000000" })
      .returning({ id: goals.id });
    aChecking = checking!.id;
    aSavings = savings!.id;
    aCategory = cat!.id;
    aGoal = goal!.id;

    const [income] = await db
      .insert(transactions)
      .values({
        userId: A_ID,
        accountId: aChecking,
        categoryId: aCategory,
        goalId: aGoal,
        kind: "income",
        amount: "5000000",
        occurredAt: new Date("2026-06-10T03:00:00Z"),
        note: "Tháng 6",
        merchant: "Công ty",
      })
      .returning({ id: transactions.id });
    incomeTxId = income!.id;

    const [bTx] = await db
      .insert(transactions)
      .values({
        userId: B_ID,
        accountId: bAcc!.id,
        kind: "expense",
        amount: "20000",
        occurredAt: new Date("2026-06-11T03:00:00Z"),
      })
      .returning({ id: transactions.id });
    bTxId = bTx!.id;

    // Transfer pair: out-leg negative (source = checking), in-leg positive
    // (destination = savings), cross-linked via transferPairId.
    const [outLeg] = await db
      .insert(transactions)
      .values({
        userId: A_ID,
        accountId: aChecking,
        kind: "transfer",
        amount: "-1000000",
        occurredAt: new Date("2026-06-12T03:00:00Z"),
      })
      .returning({ id: transactions.id });
    const [inLeg] = await db
      .insert(transactions)
      .values({
        userId: A_ID,
        accountId: aSavings,
        kind: "transfer",
        amount: "1000000",
        occurredAt: new Date("2026-06-12T03:00:00Z"),
        transferPairId: outLeg!.id,
      })
      .returning({ id: transactions.id });
    await db
      .update(transactions)
      .set({ transferPairId: inLeg!.id })
      .where(eq(transactions.id, outLeg!.id));
    transferOutId = outLeg!.id;
    transferInId = inLeg!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, A_ID));
    await db.delete(user).where(eq(user.id, B_ID));
  });

  it("returns full detail for an owned income tx", async () => {
    const detail = await getTransactionDetail(A_ID, incomeTxId);
    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({
      id: incomeTxId,
      kind: "income",
      amount: 5_000_000,
      accountName: "A ngân hàng",
      categoryName: "Lương",
      goalName: "Quỹ khẩn cấp",
      note: "Tháng 6",
      merchant: "Công ty",
      transfer: null,
    });
  });

  it("returns null for an unknown id", async () => {
    expect(await getTransactionDetail(A_ID, crypto.randomUUID())).toBeNull();
  });

  it("returns null for another user's tx (ownership, no leak)", async () => {
    expect(await getTransactionDetail(A_ID, bTxId)).toBeNull();
  });

  it("resolves transfer from/to accounts by leg sign", async () => {
    const fromOut = await getTransactionDetail(A_ID, transferOutId);
    expect(fromOut?.transfer).toEqual({
      fromAccountName: "A ngân hàng",
      toAccountName: "A tiết kiệm",
    });

    // The in-leg (positive) resolves to the same direction.
    const fromIn = await getTransactionDetail(A_ID, transferInId);
    expect(fromIn?.transfer).toEqual({
      fromAccountName: "A ngân hàng",
      toAccountName: "A tiết kiệm",
    });
  });
});
