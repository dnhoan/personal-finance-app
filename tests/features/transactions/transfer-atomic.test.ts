import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { insertTransferAtomic } from "@/features/transactions/repository";

// Exercises the transfer CTE against a live Neon branch: atomic pair creation,
// signed legs, mutual self-FK linking, cascade-on-delete, and idempotency.
const OWNER_ID = `test-xfer-${Date.now()}`;
const OWNER_EMAIL = `xfer-${Date.now()}@example.test`;
let cashId: string;
let bankId: string;

async function makeAccount(name: string): Promise<string> {
  const [a] = await db
    .insert(accounts)
    .values({ userId: OWNER_ID, name, type: "cash" })
    .returning({ id: accounts.id });
  return a!.id;
}

describe("insertTransferAtomic", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Xfer", email: OWNER_EMAIL, emailVerified: true });
    cashId = await makeAccount("Tiền mặt");
    bankId = await makeAccount("Ngân hàng");
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("creates two mutually-linked legs with signed amounts", async () => {
    const clientOpId = crypto.randomUUID();
    const pairId = await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 100_000,
      occurredAt: new Date("2026-06-12T05:00:00Z"),
      note: "test transfer",
      clientOpId,
    });

    const legs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, OWNER_ID), eq(transactions.kind, "transfer")));

    expect(legs).toHaveLength(2);
    const out = legs.find((l) => l.id === pairId)!;
    const inc = legs.find((l) => l.id !== pairId)!;
    expect(out.accountId).toBe(cashId);
    expect(out.amount).toBe("-100000"); // out leg negative
    expect(inc.accountId).toBe(bankId);
    expect(inc.amount).toBe("100000"); // in leg positive
    // Mutually linked.
    expect(out.transferPairId).toBe(inc.id);
    expect(inc.transferPairId).toBe(out.id);
    // Only the out leg carries the idempotency key.
    expect(out.clientOpId).toBe(clientOpId);
    expect(inc.clientOpId).toBeNull();
  });

  it("is idempotent: replaying the same clientOpId returns the prior pair, no duplicate", async () => {
    const clientOpId = crypto.randomUUID();
    const first = await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 50_000,
      occurredAt: new Date("2026-06-12T06:00:00Z"),
      note: null,
      clientOpId,
    });
    const second = await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 50_000,
      occurredAt: new Date("2026-06-12T06:00:00Z"),
      note: null,
      clientOpId,
    });
    expect(second).toBe(first);

    const count = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(count[0]!.n).toBe(1); // exactly one out-leg
  });

  it("cascade-deletes the paired leg when either leg is deleted", async () => {
    const clientOpId = crypto.randomUUID();
    const pairId = await insertTransferAtomic(OWNER_ID, {
      fromAccountId: cashId,
      toAccountId: bankId,
      amount: 25_000,
      occurredAt: new Date("2026-06-12T07:00:00Z"),
      note: null,
      clientOpId,
    });
    const before = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(before).toHaveLength(1);

    // Delete the out leg → its in leg (which references it) cascades away.
    await db.delete(transactions).where(eq(transactions.id, pairId));

    const remaining = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(remaining).toHaveLength(0);
  });

  it("leaves zero rows when the in-leg insert fails (no orphan half)", async () => {
    // Inject a failure: a non-existent destination account violates the FK, so
    // the whole single-statement CTE rolls back — the out-leg must not persist.
    const clientOpId = crypto.randomUUID();
    const bogusAccount = crypto.randomUUID();
    await expect(
      insertTransferAtomic(OWNER_ID, {
        fromAccountId: cashId,
        toAccountId: bogusAccount,
        amount: 10_000,
        occurredAt: new Date("2026-06-12T08:00:00Z"),
        note: null,
        clientOpId,
      }),
    ).rejects.toThrow();

    const orphans = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(orphans).toHaveLength(0);
  });
});
