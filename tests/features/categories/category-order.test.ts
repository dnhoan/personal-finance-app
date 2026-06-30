import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

const OWNER_ID = `test-cat-order-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { categories } from "@/lib/db/schema";
import { reorderCategories } from "@/features/categories/actions";
import { getDefaultCategoryIds, listCategoriesFlat } from "@/features/categories/queries";

const OWNER_EMAIL = `cat-order-${Date.now()}@example.test`;

// Three expense roots + one income root, inserted out of alphabetical order with
// explicit sort_order so ordering is deterministic and independent of name.
let food: string;
let bills: string;
let fun: string;
let salary: string;

async function sortOrderOf(id: string): Promise<number> {
  const [row] = await db
    .select({ sortOrder: categories.sortOrder })
    .from(categories)
    .where(eq(categories.id, id));
  return row!.sortOrder;
}

async function insertRoot(name: string, kind: "expense" | "income", sortOrder: number) {
  const [row] = await db
    .insert(categories)
    .values({ userId: OWNER_ID, name, slug: `${name}-${OWNER_ID}`, kind, sortOrder })
    .returning({ id: categories.id });
  return row!.id;
}

describe("category ordering", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Cat", email: OWNER_EMAIL, emailVerified: true });
    food = await insertRoot("Ăn uống", "expense", 0);
    bills = await insertRoot("Hóa đơn", "expense", 1);
    fun = await insertRoot("Giải trí", "expense", 2);
    salary = await insertRoot("Lương", "income", 0);
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("getDefaultCategoryIds returns the first root per kind by sort_order", async () => {
    const ids = await getDefaultCategoryIds(OWNER_ID);
    expect(ids.expense).toBe(food);
    expect(ids.income).toBe(salary);
  });

  it("reorderCategories writes contiguous sort_order matching the new order", async () => {
    await reorderCategories({
      kind: "expense",
      parentId: null,
      orderedIds: [fun, food, bills],
    });
    expect(await sortOrderOf(fun)).toBe(0);
    expect(await sortOrderOf(food)).toBe(1);
    expect(await sortOrderOf(bills)).toBe(2);

    // The default expense category now follows the new order.
    const ids = await getDefaultCategoryIds(OWNER_ID);
    expect(ids.expense).toBe(fun);

    // listCategoriesFlat reflects the order too.
    const flat = await listCategoriesFlat(OWNER_ID, "expense");
    expect(flat.map((c) => c.id)).toEqual([fun, food, bills]);
  });

  it("reorderCategories rejects an id outside the (kind, parent) scope", async () => {
    await expect(
      reorderCategories({
        kind: "expense",
        parentId: null,
        // salary is an income root — not part of the expense-root scope.
        orderedIds: [fun, food, bills, salary],
      }),
    ).rejects.toThrow();
  });

  it("reorderCategories rejects a partial list (length mismatch)", async () => {
    await expect(
      reorderCategories({ kind: "expense", parentId: null, orderedIds: [fun, food] }),
    ).rejects.toThrow();
  });

  it("excludes archived roots from the default and the ordered list", async () => {
    // Archive the current first expense root (fun) → default falls to the next.
    await db
      .update(categories)
      .set({ archivedAt: new Date() })
      .where(and(eq(categories.id, fun), eq(categories.userId, OWNER_ID)));

    const ids = await getDefaultCategoryIds(OWNER_ID);
    expect(ids.expense).toBe(food);

    const flat = await listCategoriesFlat(OWNER_ID, "expense");
    expect(flat.map((c) => c.id)).not.toContain(fun);
  });
});
