"use server";
import { and, eq, isNull, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { slugify } from "@/lib/slugify";
import {
  createCategorySchema,
  updateCategorySchema,
  archiveCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
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
