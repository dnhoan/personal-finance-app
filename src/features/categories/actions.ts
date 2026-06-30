"use server";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { slugify } from "@/lib/slugify";
import {
  createCategorySchema,
  updateCategorySchema,
  archiveCategorySchema,
  reorderCategoriesSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type ReorderCategoriesInput,
} from "./schemas";

function revalidateCategoryViews() {
  revalidatePath("/settings/categories");
  revalidatePath("/budgets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// Picks a slug unique within the user's categories: slugify(name), then -2, -3…
async function uniqueSlug(userId: string, name: string): Promise<string> {
  const base = slugify(name) || "danh-muc";
  const existing = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.userId, userId), like(categories.slug, `${base}%`)));
  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function createCategory(input: CreateCategoryInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createCategorySchema.parse(input);

  let kind = data.kind;
  if (data.parentId) {
    // Parent must exist, belong to the user, and itself be a root (depth cap = 2).
    const [parent] = await db
      .select({ id: categories.id, kind: categories.kind, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, data.parentId), eq(categories.userId, user.id)));
    if (!parent) throw new Error("Danh mục cha không tồn tại");
    if (parent.parentId !== null) throw new Error("Danh mục con không thể có danh mục con");
    kind = parent.kind; // child inherits the parent's kind
  }

  // Append after existing siblings (in the same kind + parent scope) so a new
  // category lands last rather than colliding with everyone at sort_order 0.
  const nextSortOrder = await nextSortOrderForScope(user.id, kind, data.parentId ?? null);

  const [row] = await db
    .insert(categories)
    .values({
      userId: user.id,
      name: data.name,
      slug: await uniqueSlug(user.id, data.name),
      kind,
      parentId: data.parentId ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
      sortOrder: nextSortOrder,
    })
    .returning({ id: categories.id });

  revalidateCategoryViews();
  return { id: row!.id };
}

export async function updateCategory(input: UpdateCategoryInput): Promise<void> {
  const { user } = await requireSession();
  const data = updateCategorySchema.parse(input);

  await db
    .update(categories)
    .set({
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, data.id), eq(categories.userId, user.id)));

  revalidateCategoryViews();
}

// Soft-archive: keeps the row (transactions/budgets still reference it) but hides
// it from pickers and lists. A root with non-archived children is blocked.
export async function archiveCategory(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const { id } = archiveCategorySchema.parse(input);

  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.parentId, id),
        eq(categories.userId, user.id),
        isNull(categories.archivedAt),
      ),
    );
  if (children.length > 0) {
    throw new Error("Hãy lưu trữ hoặc xóa danh mục con trước");
  }

  await db
    .update(categories)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  revalidateCategoryViews();
}

// Next sort_order for a sibling group: MAX(sort_order)+1, or 1 when the scope is
// empty. parentId null = root group.
async function nextSortOrderForScope(
  userId: string,
  kind: CreateCategoryInput["kind"],
  parentId: string | null,
): Promise<number> {
  const rows = await db.execute<{ next: number }>(sql`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next
    FROM categories
    WHERE user_id = ${userId}
      AND kind = ${kind}
      AND parent_id IS NOT DISTINCT FROM ${parentId}
  `);
  return Number(rows.rows[0]?.next ?? 1);
}

// Persists a new order for ONE sibling group (drag-and-drop drop event sends the
// full reordered id list). Validates every id belongs to the user and matches the
// scope's non-archived sibling set before writing, so a client can't move another
// user's, another scope's, or a stale (archived) row; assigns sort_order = index.
export async function reorderCategories(input: ReorderCategoriesInput): Promise<void> {
  const { user } = await requireSession();
  const { kind, parentId, orderedIds } = reorderCategoriesSchema.parse(input);

  await db.transaction(async (tx) => {
    // The authoritative non-archived sibling set for this exact scope.
    const siblings = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, user.id),
          eq(categories.kind, kind),
          parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId),
          isNull(categories.archivedAt),
        ),
      );

    const scopeIds = new Set(siblings.map((s) => s.id));
    const incoming = new Set(orderedIds);
    // Reject if the client list doesn't match the scope exactly (length + membership):
    // a stale list (sibling archived/added since load) fails rather than corrupting order.
    if (
      orderedIds.length !== scopeIds.size ||
      incoming.size !== orderedIds.length ||
      orderedIds.some((id) => !scopeIds.has(id))
    ) {
      throw new Error("Danh sách danh mục đã thay đổi — hãy tải lại trang");
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(categories.id, orderedIds[i]!), eq(categories.userId, user.id)));
    }
  });

  revalidateCategoryViews();
}
