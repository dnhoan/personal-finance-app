import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { monthStartDate } from "@/lib/month";
import { buildCategoryTree } from "./category-hierarchy";

export type { CategoryKind, CategoryRow, CategoryChild, CategoryNode } from "./category-hierarchy";
import type { CategoryKind, CategoryRow, CategoryNode } from "./category-hierarchy";

// Non-archived categories (optionally filtered by kind), name-ordered.
export async function listCategoriesFlat(
  userId: string,
  kind?: CategoryKind,
): Promise<CategoryRow[]> {
  const conds = [eq(categories.userId, userId), isNull(categories.archivedAt)];
  if (kind) conds.push(eq(categories.kind, kind));
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      kind: categories.kind,
      icon: categories.icon,
      color: categories.color,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(and(...conds))
    .orderBy(categories.name);
}

// Per-category transaction sum for one month, keyed by category_id, scoped to a
// kind (expense spend or income received). Buckets on the `occurred_month_ict`
// generated column (ICT month) — never re-derive from occurred_at.
async function amountByCategory(
  userId: string,
  kind: CategoryKind,
  monthKey: string,
): Promise<Map<string, number>> {
  const rows = await db.execute<{ category_id: string; total: string }>(sql`
    SELECT category_id, SUM(amount)::text AS total
    FROM transactions
    WHERE user_id = ${userId}
      AND kind = ${kind}
      AND category_id IS NOT NULL
      AND occurred_month_ict = ${monthStartDate(monthKey)}
    GROUP BY category_id
  `);
  return new Map(rows.rows.map((r) => [r.category_id, Number(r.total)]));
}

// Two-level tree for a kind. When `monthKey` is given, attaches each category's
// own monthly total for that kind; a parent's `spent` rolls up its children's.
export async function listCategoryTree(
  userId: string,
  kind: CategoryKind,
  monthKey?: string,
): Promise<CategoryNode[]> {
  const rows = await listCategoriesFlat(userId, kind);
  const spentMap = monthKey
    ? await amountByCategory(userId, kind, monthKey)
    : new Map<string, number>();
  return buildCategoryTree(rows, spentMap);
}

// Total expense spend for a month (for the categories-page header summary).
export async function totalExpenseForMonth(userId: string, monthKey: string): Promise<number> {
  const rows = await db.execute<{ total: string }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS total
    FROM transactions
    WHERE user_id = ${userId}
      AND kind = 'expense'
      AND occurred_month_ict = ${monthStartDate(monthKey)}
  `);
  return Number(rows.rows[0]?.total ?? 0);
}
