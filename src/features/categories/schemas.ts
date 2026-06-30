import { z } from "zod";

export const CATEGORY_KINDS = ["income", "expense"] as const;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Màu không hợp lệ")
  .optional();

// Create: kind + parent are set once (immutable after). A child's kind is forced
// to its parent's kind server-side; only roots may be parents (depth cap = 2).
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục bắt buộc").max(60),
  kind: z.enum(CATEGORY_KINDS),
  parentId: z.string().uuid().nullish(),
  icon: z.string().trim().max(40).optional(),
  color: hexColor,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Update: name / icon / color only (kind + parent are immutable).
export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Tên danh mục bắt buộc").max(60),
  icon: z.string().trim().max(40).optional(),
  color: hexColor,
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const archiveCategorySchema = z.object({ id: z.string().uuid() });

// Reorder one sibling group: drag-and-drop sends the full reordered id list for a
// single (kind, parentId) scope. `parentId` null = root group.
export const reorderCategoriesSchema = z.object({
  kind: z.enum(CATEGORY_KINDS),
  parentId: z.string().uuid().nullable(),
  orderedIds: z.array(z.string().uuid()).nonempty(),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
