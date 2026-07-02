import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, categories, transactions } from "@/lib/db/schema";
import { insertTxIdempotent } from "@/features/transactions/repository";
import {
  assertTxRefsOwned,
  assertTransferAccountsOwned,
} from "@/features/transactions/lib/assert-tx-refs-owned";

// Write-path tenant isolation, against a live Neon branch:
//  - a user may only reference accounts/categories they own (cross-tenant IDOR),
//  - clientOpId idempotency is namespaced per user, so a shared key cannot
//    suppress another user's write.
const stamp = Date.now();
const A_ID = `test-iso-a-${stamp}`;
const B_ID = `test-iso-b-${stamp}`;

let aAccount: string;
let aCategory: string;
let bAccount: string;

describe("cross-tenant transaction isolation", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: A_ID, name: "A", email: `iso-a-${stamp}@example.test`, emailVerified: true },
      { id: B_ID, name: "B", email: `iso-b-${stamp}@example.test`, emailVerified: true },
    ]);
    const [aAcc] = await db
      .insert(accounts)
      .values({ userId: A_ID, name: "A ví", type: "cash" })
      .returning({ id: accounts.id });
    const [bAcc] = await db
      .insert(accounts)
      .values({ userId: B_ID, name: "B ví", type: "cash" })
      .returning({ id: accounts.id });
    const [aCat] = await db
      .insert(categories)
      .values({ userId: A_ID, name: "Ăn", slug: `an-${stamp}`, kind: "expense" })
      .returning({ id: categories.id });
    aAccount = aAcc!.id;
    bAccount = bAcc!.id;
    aCategory = aCat!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, A_ID));
    await db.delete(user).where(eq(user.id, B_ID));
  });

  it("rejects referencing another user's account", async () => {
    await expect(assertTxRefsOwned(B_ID, aAccount, null, "expense")).rejects.toThrow();
  });

  it("rejects referencing another user's category", async () => {
    await expect(assertTxRefsOwned(B_ID, bAccount, aCategory, "expense")).rejects.toThrow();
  });

  it("rejects a category whose kind mismatches", async () => {
    await expect(assertTxRefsOwned(A_ID, aAccount, aCategory, "income")).rejects.toThrow();
  });

  it("accepts an owned account + matching category", async () => {
    await expect(assertTxRefsOwned(A_ID, aAccount, aCategory, "expense")).resolves.toBeUndefined();
  });

  it("rejects a transfer leg the user does not own", async () => {
    await expect(assertTransferAccountsOwned(B_ID, bAccount, aAccount)).rejects.toThrow();
  });

  it("namespaces clientOpId per user — a shared key drops neither write", async () => {
    const clientOpId = crypto.randomUUID();
    const row = (accountId: string) => ({
      accountId,
      categoryId: null,
      goalId: null,
      kind: "expense" as const,
      amount: 10_000,
      occurredAt: new Date("2026-06-12T05:00:00Z"),
      note: null,
      merchant: null,
      clientOpId,
    });

    const aRow = await insertTxIdempotent(A_ID, row(aAccount));
    const bRow = await insertTxIdempotent(B_ID, row(bAccount));
    expect(aRow).not.toBe(bRow);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(rows).toHaveLength(2);
  });
});
