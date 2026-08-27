import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { bankLinks } from "@/lib/db/schema";
import { normaliseAccountNumber } from "@/features/bank-sync/schemas";

export type ResolvedBankLink = { id: string; accountId: string };

/**
 * Finds the user's mapping for the (gateway, accountNumber) pair in a payload.
 *
 * Both sides are compared case-insensitively and with separators stripped: the
 * user types the bank name and number by hand in settings, while SePay sends its
 * own casing ("MBBank" vs "mbbank") and sometimes formats the number. Comparing
 * raw strings would push perfectly good deliveries into the unmatched pile over
 * a capital letter.
 *
 * Scoped to `userId` — the token identifies the user, and an account number
 * belonging to someone else must never resolve here.
 */
export async function resolveBankLink(
  database: Db,
  userId: string,
  gateway: string,
  accountNumber: string,
): Promise<ResolvedBankLink | null> {
  const [link] = await database
    .select({ id: bankLinks.id, accountId: bankLinks.accountId })
    .from(bankLinks)
    .where(
      and(
        eq(bankLinks.userId, userId),
        sql`lower(${bankLinks.gateway}) = lower(${gateway.trim()})`,
        eq(bankLinks.accountNumber, normaliseAccountNumber(accountNumber)),
      ),
    )
    .limit(1);

  return link ?? null;
}
