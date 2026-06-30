import { pgTable, uuid, text, numeric, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "../auth-schema";
import { accountType, accountStatus } from "./enums";
import { timestamps } from "./timestamps";

// Money source/sink. `debt` accounts participate in the unified balance; their
// `status` tracks the settlement lifecycle. All amounts are VND, numeric(18,0).
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountType("type").notNull(),
    currency: text("currency").notNull().default("VND"),
    initialBalance: numeric("initial_balance", { precision: 18, scale: 0 }).notNull().default("0"),
    status: accountStatus("status").notNull().default("open"),
    // At most one default account per user — quick-add pre-selects it. Enforced at
    // the DB level by the partial unique index below, not only in app code.
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    // One default per user: the index only covers rows where is_default is true,
    // so non-default rows don't collide on user_id.
    uniqueIndex("accounts_user_default_uniq")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);
