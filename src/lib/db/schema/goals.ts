import { pgTable, uuid, text, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "../auth-schema";
import { accounts } from "./accounts";
import { timestamps } from "./timestamps";

// Savings goals. Progress is COMPUTED on read via SUM(transactions.amount) WHERE
// goal_id = $g — no denormalised current_amount column, which avoids drift bugs.
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 18, scale: 0 }).notNull(),
    targetDate: date("target_date"),
    // Goal lives as a virtual bucket within an account; null when unassigned.
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);
