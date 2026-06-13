import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { insertTxIdempotent } from "@/features/transactions/repository";

// Verifies clientOpId idempotency for income/expense inserts, including the
// concurrent (parallel double-submit) case, against a live Neon branch.
const OWNER_ID = `test-idem-${Date.now()}`;
const OWNER_EMAIL = `idem-${Date.now()}@example.test`;
let accountId: string;

describe("insertTxIdempotent", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Idem", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ví", type: "cash" })
      .returning({ id: accounts.id });
    accountId = a!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  const baseData = (clientOpId: string) => ({
    accountId,
    categoryId: null,
    kind: "expense" as const,
    amount: 50_000,
    occurredAt: new Date("2026-06-12T05:00:00Z"),
    note: null,
    merchant: null,
    clientOpId,
  });

  it("returns the same id on a sequential replay", async () => {
    const clientOpId = crypto.randomUUID();
    const first = await insertTxIdempotent(OWNER_ID, baseData(clientOpId));
    const second = await insertTxIdempotent(OWNER_ID, baseData(clientOpId));
    expect(second).toBe(first);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(rows).toHaveLength(1);
  });

  it("creates exactly one row under parallel double-submit", async () => {
    const clientOpId = crypto.randomUUID();
    const [a, b] = await Promise.all([
      insertTxIdempotent(OWNER_ID, baseData(clientOpId)),
      insertTxIdempotent(OWNER_ID, baseData(clientOpId)),
    ]);
    expect(a).toBe(b);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(rows).toHaveLength(1);
  });
});
