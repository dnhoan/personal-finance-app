import { eq } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";

/**
 * The visible ledger is the confirmed ledger.
 *
 * A `pending` row is a real bank balance movement that has not been given a
 * category yet. It COUNTS toward account balances, net worth, and cash flow —
 * the money genuinely moved — but it must NOT appear in the transaction list,
 * the CSV export, or any category-based report, because it has no category to
 * report under.
 *
 * Reach for this at every read that answers "which transactions are there?".
 * Reads that answer "how much money is there?" deliberately omit it; those
 * call sites carry a comment saying so.
 */
export const confirmedOnly = eq(transactions.reviewStatus, "confirmed");
