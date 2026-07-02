import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

// Stub the auth gate so the server action runs against the live DB with a fixed
// test user, and neutralise next/cache (no request context under vitest).
const OWNER_ID = `test-update-acc-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { updateAccount } from "@/features/accounts/actions";
import { getAccountWithBalance } from "@/features/accounts/queries";

const OWNER_EMAIL = `update-acc-${Date.now()}@example.test`;
let accId: string;

describe("updateAccount opening balance", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Upd", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ví", type: "cash", initialBalance: "1000000" })
      .returning({ id: accounts.id });
    accId = a!.id;
    // One expense so the derived balance differs from the opening balance.
    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: accId,
      kind: "expense",
      amount: "200000",
      occurredAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("sets the displayed balance to the entered value by back-solving the opening balance", async () => {
    // Before: opening 1_000_000 − expense 200_000 = 800_000.
    const before = await getAccountWithBalance(OWNER_ID, accId);
    expect(before?.initialBalance).toBe(1_000_000);
    expect(before?.balance).toBe(800_000);

    await updateAccount({ id: accId, name: "Ví tiền", currentBalance: 1_500_000 });

    // Displayed balance now equals the entered target; opening balance was raised
    // to absorb the existing −200_000 of transactions (1_700_000 − 200_000).
    const after = await getAccountWithBalance(OWNER_ID, accId);
    expect(after?.name).toBe("Ví tiền");
    expect(after?.balance).toBe(1_500_000);
    expect(after?.initialBalance).toBe(1_700_000);
  });

  it("does not touch accounts owned by another user", async () => {
    const OTHER = `test-update-acc-other-${Date.now()}`;
    await db
      .insert(user)
      .values({ id: OTHER, name: "Other", email: `${OTHER}@example.test`, emailVerified: true });
    const [foreign] = await db
      .insert(accounts)
      .values({ userId: OTHER, name: "Không phải của bạn", type: "bank", initialBalance: "700000" })
      .returning({ id: accounts.id });

    // Acting as OWNER_ID, targeting OTHER's account — must be a no-op.
    await updateAccount({ id: foreign!.id, name: "Bị chiếm", currentBalance: 9_000_000 });

    const [row] = await db
      .select({ name: accounts.name, initialBalance: accounts.initialBalance })
      .from(accounts)
      .where(eq(accounts.id, foreign!.id));
    expect(row!.name).toBe("Không phải của bạn");
    expect(row!.initialBalance).toBe("700000");

    await db.delete(user).where(eq(user.id, OTHER));
  });
});
