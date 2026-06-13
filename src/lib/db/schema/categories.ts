import { pgTable, uuid, text, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { user } from "../auth-schema";
import { timestamps } from "./timestamps";

// Hierarchical spending buckets. `parentId` self-FK builds the tree; max depth 2
// is enforced at the app layer (not the DB) per KISS. `slug` is unique per user.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    color: text("color"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_user_slug_uniq").on(t.userId, t.slug),
    index("categories_parent_idx").on(t.parentId),
  ],
);
