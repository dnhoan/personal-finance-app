import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, categories } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";

// First-sign-in provisioning against a live Neon branch: atomic categories +
// default Cash account, idempotent, guarded on ACTIVE accounts.
const stamp = Date.now();
const created: string[] = [];

async function newUser(): Promise<string> {
  const id = `test-seed-${stamp}-${Math.random().toString(36).slice(2)}`;
  await db.insert(user).values({ id, name: "s", email: `${id}@x.test`, emailVerified: true });
  created.push(id);
  return id;
}

async function snapshot(uid: string) {
  const cats = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, uid));
  const accts = await db
    .select({
      id: accounts.id,
      isDefault: accounts.isDefault,
      type: accounts.type,
      status: accounts.status,
    })
    .from(accounts)
    .where(eq(accounts.userId, uid));
  return { catCount: cats.length, accts };
}

describe("seed provisioning", () => {
  afterAll(async () => {
    for (const id of created) await db.delete(user).where(eq(user.id, id));
  });

  it("provisions 10 categories + one default Cash account for a fresh user", async () => {
    const uid = await newUser();
    const result = await seed(db, uid);
    expect(result).toEqual({ categories: 10, account: true });

    const { catCount, accts } = await snapshot(uid);
    expect(catCount).toBe(10);
    expect(accts).toHaveLength(1);
    expect(accts[0]).toMatchObject({ isDefault: true, type: "cash", status: "open" });
  });

  it("is idempotent — a second run adds nothing", async () => {
    const uid = await newUser();
    await seed(db, uid);
    const second = await seed(db, uid);
    expect(second).toEqual({ categories: 0, account: false });

    const { catCount, accts } = await snapshot(uid);
    expect(catCount).toBe(10);
    expect(accts).toHaveLength(1);
  });

  it("does not add a default account when the user already has an active one", async () => {
    const uid = await newUser();
    await db.insert(accounts).values({ userId: uid, name: "Bank", type: "bank" });
    const result = await seed(db, uid);
    expect(result.account).toBe(false);

    const { accts } = await snapshot(uid);
    expect(accts).toHaveLength(1); // only the pre-existing account
  });

  it("re-provisions a default account when the only account is archived", async () => {
    const uid = await newUser();
    await db
      .insert(accounts)
      .values({ userId: uid, name: "Old", type: "cash", status: "archived" });
    const result = await seed(db, uid);
    expect(result.account).toBe(true);

    const { accts } = await snapshot(uid);
    const active = accts.filter((a) => a.status !== "archived");
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ isDefault: true, type: "cash" });
  });
});
