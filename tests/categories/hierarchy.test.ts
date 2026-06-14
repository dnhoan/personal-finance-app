import { describe, expect, it } from "vitest";
import { buildCategoryTree, type CategoryRow } from "@/features/categories/category-hierarchy";
import { slugify } from "@/lib/slugify";

const cat = (id: string, name: string, parentId: string | null = null): CategoryRow => ({
  id,
  name,
  slug: id,
  kind: "expense",
  icon: null,
  color: null,
  parentId,
});

describe("buildCategoryTree", () => {
  it("nests children under their root and preserves input order", () => {
    const tree = buildCategoryTree([
      cat("food", "Ăn uống"),
      cat("coffee", "Cà phê"),
      cat("food-fast", "Quán ăn nhanh", "food"),
      cat("food-market", "Đi chợ", "food"),
    ]);
    expect(tree.map((r) => r.id)).toEqual(["food", "coffee"]);
    expect(tree[0]!.children.map((c) => c.id)).toEqual(["food-fast", "food-market"]);
    expect(tree[1]!.children).toHaveLength(0);
  });

  it("drops grandchildren (depth cap = 2 — a child of a child is not a root)", () => {
    const tree = buildCategoryTree([
      cat("food", "Ăn uống"),
      cat("food-fast", "Quán ăn nhanh", "food"),
      cat("grand", "Burger", "food-fast"), // grandchild → dropped
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children.map((c) => c.id)).toEqual(["food-fast"]);
    // The grandchild appears nowhere in the tree.
    expect(JSON.stringify(tree)).not.toContain("grand");
  });

  it("rolls a parent's spent up from its children", () => {
    const spent = new Map([
      ["food", 100_000],
      ["food-fast", 820_000],
      ["food-market", 1_180_000],
    ]);
    const tree = buildCategoryTree(
      [
        cat("food", "Ăn uống"),
        cat("food-fast", "Nhanh", "food"),
        cat("food-market", "Chợ", "food"),
      ],
      spent,
    );
    expect(tree[0]!.spent).toBe(100_000 + 820_000 + 1_180_000);
    expect(tree[0]!.children.find((c) => c.id === "food-fast")!.spent).toBe(820_000);
  });

  // The builder is kind-agnostic: it reflects whatever amounts the caller puts in
  // the map. Income trees must carry income totals — the bug was the per-category
  // query hardcoding kind='expense', leaving income categories at 0.
  it("attaches the amount map regardless of kind (income totals show up)", () => {
    const income: CategoryRow = { ...cat("salary", "Lương"), kind: "income" };
    const tree = buildCategoryTree([income], new Map([["salary", 20_000_000]]));
    expect(tree[0]!.spent).toBe(20_000_000);
  });
});

describe("slugify", () => {
  it.each([
    ["Cà phê & Trà", "ca-phe-tra"],
    ["Ăn uống", "an-uong"],
    ["Đi chợ", "di-cho"],
    ["Dịch vụ & Cước phí", "dich-vu-cuoc-phi"],
    ["  Nhà ở  ", "nha-o"],
    ["Quán ăn nhanh", "quan-an-nhanh"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
