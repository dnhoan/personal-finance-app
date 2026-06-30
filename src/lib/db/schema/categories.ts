import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "../auth-schema";
import { categoryKind } from "./enums";
import { timestamps } from "./timestamps";

// Hierarchical spending buckets. `parentId` self-FK builds the tree; max depth 2
// is enforced at the app layer (not the DB) per KISS. `slug` is unique per user.
// `kind` types the category income vs expense (budgets apply to expense only).
// `archivedAt` soft-deletes — the row stays (transactions/budgets reference it)
// but it's filtered out of pickers and lists.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: categoryKind("kind").notNull().default("expense"),
    icon: text("icon"),
    color: text("color"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    // User-controlled ordering within a sibling group (lower = earlier). Drives the
    // picker display order and the quick-add default category (first root per kind).
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_user_slug_uniq").on(t.userId, t.slug),
    index("categories_parent_idx").on(t.parentId),
    // Keep ordered reads (listCategoriesFlat, getDefaultCategoryIds) cheap.
    index("categories_user_kind_order_idx").on(t.userId, t.kind, t.sortOrder),
  ],
);
