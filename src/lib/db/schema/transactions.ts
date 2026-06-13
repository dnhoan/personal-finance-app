import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  date,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "../auth-schema";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { goals } from "./goals";
import { recurringRules } from "./recurring-rules";
import { transactionKind } from "./enums";
import { timestamps } from "./timestamps";

// Core ledger. Transfers are ONE pair of rows linked via `transferPairId` (self-FK);
// atomic write is enforced at the action layer. `clientOpId` is the per-submit
// idempotency key (UPSERT ON CONFLICT DO NOTHING) so client retries can't double-post.
//
// `occurredMonthIct` materialises the month bucket ONCE at write time interpreting
// `occurredAt` as Asia/Ho_Chi_Minh calendar time, so every month-bucketed report,
// budget, and renewal query reads a uniform value instead of re-deriving the TZ math.
export const transactions = pgTable(
  "transactions",
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
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    occurredMonthIct: date("occurred_month_ict").generatedAlwaysAs(
      sql`(date_trunc('month', (occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')))::date`,
    ),
    note: text("note"),
    merchant: text("merchant"),
    // Deleting one side of a transfer cascades to its mirror row.
    transferPairId: uuid("transfer_pair_id").references((): AnyPgColumn => transactions.id, {
      onDelete: "cascade",
    }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    // Deleting a rule must NOT delete its materialised history.
    recurringRuleId: uuid("recurring_rule_id").references(() => recurringRules.id, {
      onDelete: "set null",
    }),
    clientOpId: uuid("client_op_id"),
    ...timestamps,
  },
  (t) => [
    index("transactions_user_occurred_at_idx").on(t.userId, t.occurredAt.desc()),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
    index("transactions_user_month_idx").on(t.userId, t.occurredMonthIct),
    // Idempotency: at most one row per client-supplied op id.
    uniqueIndex("transactions_client_op_id_uniq")
      .on(t.clientOpId)
      .where(sql`client_op_id IS NOT NULL`),
    // Idempotent materialisation: one instance per (rule, occurrence).
    uniqueIndex("transactions_recurring_occurred_uniq")
      .on(t.recurringRuleId, t.occurredAt)
      .where(sql`recurring_rule_id IS NOT NULL`),
  ],
);
