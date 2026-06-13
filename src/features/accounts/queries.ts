import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { accountStatus, accountType } from "@/lib/db/schema";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: (typeof accountType.enumValues)[number];
  status: (typeof accountStatus.enumValues)[number];
  currency: string;
  /** initialBalance + signed sum of transactions, as a whole-VND number. */
  balance: number;
};

// Balance = opening balance + signed sum of transactions on the account.
// income → +amount, expense → −amount, transfer legs are stored already-signed
// (out leg negative, in leg positive), so they sum directly.
export async function listAccountsWithBalance(userId: string): Promise<AccountWithBalance[]> {
  const rows = await db.execute<{
    id: string;
    name: string;
    type: AccountWithBalance["type"];
    status: AccountWithBalance["status"];
    currency: string;
    balance: string;
  }>(sql`
    SELECT
      a.id, a.name, a.type, a.status, a.currency,
      (a.initial_balance + COALESCE(SUM(
        CASE t.kind WHEN 'income' THEN t.amount WHEN 'expense' THEN -t.amount ELSE t.amount END
      ), 0))::text AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
    WHERE a.user_id = ${userId}
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    currency: r.currency,
    balance: Number(r.balance),
  }));
}

/** Active (non-archived) accounts for pickers, ordered by creation. */
export async function listActiveAccounts(
  userId: string,
): Promise<{ id: string; name: string; type: AccountWithBalance["type"] }[]> {
  const rows = await db.execute<{ id: string; name: string; type: AccountWithBalance["type"] }>(sql`
    SELECT id, name, type FROM accounts
    WHERE user_id = ${userId} AND status <> 'archived'
    ORDER BY created_at ASC
  `);
  return rows.rows;
}
