import { pgTable, uuid, text, numeric, date, integer, boolean, index } from "drizzle-orm/pg-core";
import { user } from "../auth-schema";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { transactionKind } from "./enums";
import { timestamps } from "./timestamps";

// Recurring transaction templates driven by an RRULE string. `nextDue` drives the
// cron materialisation; `notifiedAt` is the alert idempotency key; `lastMaterialisedAt`
// is the cursor marking how far instances have been generated.
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
    kind: transactionKind("kind").notNull(),
    amount: numeric("amount", { precision: 18, scale: 0 }).notNull(),
    note: text("note"),
    rrule: text("rrule").notNull(),
    nextDue: date("next_due").notNull(),
    notifiedAt: date("notified_at"),
    lastMaterialisedAt: date("last_materialised_at"),
    leadDays: integer("lead_days").notNull().default(3),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("recurring_rules_user_idx").on(t.userId),
    // Cron scans active rules by due date.
    index("recurring_rules_next_due_idx").on(t.nextDue),
  ],
);
