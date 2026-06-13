import { pgTable, uuid, text, numeric, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../auth-schema";
import { categories } from "./categories";
import { timestamps } from "./timestamps";

// Monthly per-category budget. `periodMonth` stores the month-start date. The
// UNIQUE(user, category, period) constraint backs the per-month upsert in Phase 5.
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    periodMonth: date("period_month").notNull(),
    amount: numeric("amount", { precision: 18, scale: 0 }).notNull(),
    rollover: boolean("rollover").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("budgets_user_category_month_uniq").on(t.userId, t.categoryId, t.periodMonth),
  ],
);
