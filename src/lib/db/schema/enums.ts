import { pgEnum } from "drizzle-orm/pg-core";

// Account kinds. `debt` keeps liabilities inside the unified balance computation
// (no separate debts table); `status` below is only meaningful for debt accounts.
export const accountType = pgEnum("account_type", [
  "cash",
  "bank",
  "credit_card",
  "e_wallet",
  "debt",
]);

// Lifecycle for debt accounts (Open → Partial → Settled). Non-debt accounts stay `open`.
export const accountStatus = pgEnum("account_status", ["open", "partial", "settled", "archived"]);

// Transaction direction. `transfer` rows come in linked pairs and carry no category.
export const transactionKind = pgEnum("transaction_kind", ["income", "expense", "transfer"]);
