// Pure category tree types + builder. No DB / "server-only" so it is unit-testable
// and importable from client components (types are erased at build).

export type CategoryKind = "income" | "expense";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  parentId: string | null;
};

export type CategoryChild = CategoryRow & { spent: number };
export type CategoryNode = CategoryRow & { spent: number; children: CategoryChild[] };

// Builds a two-level tree (roots + children). A parent's `spent` rolls up its
// children's own spend. Grandchildren can't exist (depth cap = 2 enforced at the
// action layer); any row whose parent isn't a root here is dropped from the tree.
export function buildCategoryTree(
  rows: CategoryRow[],
  spentMap: Map<string, number> = new Map(),
): CategoryNode[] {
  const ownSpent = (id: string) => spentMap.get(id) ?? 0;
  const rootIds = new Set(rows.filter((r) => r.parentId === null).map((r) => r.id));

  const childrenByParent = new Map<string, CategoryChild[]>();
  for (const r of rows) {
    if (r.parentId === null || !rootIds.has(r.parentId)) continue;
    const list = childrenByParent.get(r.parentId) ?? [];
    list.push({ ...r, spent: ownSpent(r.id) });
    childrenByParent.set(r.parentId, list);
  }

  return rows
    .filter((r) => r.parentId === null)
    .map((root) => {
      const children = childrenByParent.get(root.id) ?? [];
      const childSpent = children.reduce((sum, c) => sum + c.spent, 0);
      return { ...root, children, spent: ownSpent(root.id) + childSpent };
    });
}
