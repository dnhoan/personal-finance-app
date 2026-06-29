import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
  transactions,
  recurringRules,
  budgets,
  goals,
} from "@/lib/db/schema";
import { user } from "@/lib/db/auth-schema";

export const EXPORT_SCHEMA_VERSION = "1";

// Full per-user data bundle for backup/portability. Every entity is fetched
// scoped to the user_id (no joins — the raw rows mirror the DB so the bundle can
// round-trip). The `user` row excludes nothing sensitive beyond identity (no
// password/token columns exist on it). Runs all reads concurrently.
export async function buildJsonBundle(userId: string) {
  const [profile, accountRows, categoryRows, txRows, recurringRows, budgetRows, goalRows] =
    await Promise.all([
      db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId)),
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(categories).where(eq(categories.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)),
      db.select().from(recurringRules).where(eq(recurringRules.userId, userId)),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
      db.select().from(goals).where(eq(goals.userId, userId)),
    ]);

  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    user: profile[0] ?? null,
    accounts: accountRows,
    categories: categoryRows,
    transactions: txRows,
    recurring_rules: recurringRows,
    budgets: budgetRows,
    goals: goalRows,
  };
}
