import { pgTable, uuid, text, numeric, index } from "drizzle-orm/pg-core";
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
    ...timestamps,
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);
