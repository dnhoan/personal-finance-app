import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

// Stub the auth gate so the server actions run against the live DB with a fixed
// test user, and neutralise next/cache (no request context under vitest).
const OWNER_ID = `test-default-acc-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts } from "@/lib/db/schema";
import { archiveAccount, setDefaultAccount } from "@/features/accounts/actions";
import { getDefaultAccountId } from "@/features/accounts/queries";

const OWNER_EMAIL = `default-acc-${Date.now()}@example.test`;
let acc1: string;
let acc2: string;

async function isDefault(id: string): Promise<boolean> {
  const [row] = await db
    .select({ isDefault: accounts.isDefault })
    .from(accounts)
    .where(eq(accounts.id, id));
  return row!.isDefault;
}

async function countDefaults(): Promise<number> {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, OWNER_ID), eq(accounts.isDefault, true)));
  return rows.length;
}

describe("default account actions", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Def", email: OWNER_EMAIL, emailVerified: true });
    const [a1] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ví", type: "cash" })
      .returning({ id: accounts.id });
    const [a2] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ngân hàng", type: "bank" })
      .returning({ id: accounts.id });
    acc1 = a1!.id;
    acc2 = a2!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  beforeEach(async () => {
    // Reset to a known state: neither account default, both active.
    await db
      .update(accounts)
      .set({ isDefault: false, status: "open" })
      .where(eq(accounts.userId, OWNER_ID));
  });

  it("sets exactly one account as default", async () => {
    await setDefaultAccount({ id: acc1 });
    expect(await isDefault(acc1)).toBe(true);
    expect(await countDefaults()).toBe(1);
    expect(await getDefaultAccountId(OWNER_ID)).toBe(acc1);
  });

  it("moves the default when a different account is set (clears the prior)", async () => {
    await setDefaultAccount({ id: acc1 });
    await setDefaultAccount({ id: acc2 });
    expect(await isDefault(acc1)).toBe(false);
    expect(await isDefault(acc2)).toBe(true);
    expect(await countDefaults()).toBe(1);
  });

  it("does not set an archived account as default", async () => {
    await db.update(accounts).set({ status: "archived" }).where(eq(accounts.id, acc2));
    await setDefaultAccount({ id: acc2 });
    expect(await isDefault(acc2)).toBe(false);
    expect(await countDefaults()).toBe(0);
  });

  it("leaves the existing default intact when targeting an archived account", async () => {
    await setDefaultAccount({ id: acc1 });
    await db.update(accounts).set({ status: "archived" }).where(eq(accounts.id, acc2));
    await setDefaultAccount({ id: acc2 });
    // acc1 must remain the default — the archived target is rejected outright.
    expect(await isDefault(acc1)).toBe(true);
    expect(await countDefaults()).toBe(1);
  });

  it("clears the default flag when the default account is archived", async () => {
    await setDefaultAccount({ id: acc1 });
    expect(await isDefault(acc1)).toBe(true);
    await archiveAccount({ id: acc1 });
    expect(await isDefault(acc1)).toBe(false);
    expect(await getDefaultAccountId(OWNER_ID)).toBeNull();
  });
});
