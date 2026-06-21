import { pgEnum } from "drizzle-orm/pg-core";

// Account kinds. `debt` (you owe — a liability) and `receivable` (owed to you — an
// asset) both keep their running balance inside the unified balance computation
// (no separate debts table); `status` below is only meaningful for these two.
// A debt is paid down with expense tx; a receivable is collected with income tx.
export const accountType = pgEnum("account_type", [
  "cash",
  "bank",
  "credit_card",
  "e_wallet",
  "debt",
  "receivable",
]);

// Lifecycle for debt/receivable accounts (Open → Partial → Settled). Other
// account types stay `open`.
export const accountStatus = pgEnum("account_status", ["open", "partial", "settled", "archived"]);

// Transaction direction. `transfer` rows come in linked pairs and carry no category.
export const transactionKind = pgEnum("transaction_kind", ["income", "expense", "transfer"]);

// Categories are typed income or expense (no transfer — transfers carry no
// category). Budgets only apply to expense categories.
export const categoryKind = pgEnum("category_kind", ["income", "expense"]);
