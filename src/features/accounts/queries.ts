import "server-only";
import { cache } from "react";
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
  /** The user's single default account (quick-add pre-selection). */
  isDefault: boolean;
};

// Balance for spending accounts = opening balance + signed sum of transactions
// (income +amount, expense −amount, transfer legs stored already-signed).
//
// debt/receivable accounts model an OUTSTANDING amount, not a spendable balance:
// `balance` = initial − settled, where settling tx are expense (pay down a debt)
// or income (collect a receivable). It counts down toward 0 as the obligation
// clears, so a debt's positive `balance` is "still owed" and a receivable's is
// "still to collect" — matching the /debts surface and feeding net worth with the
// correct sign in groupAccounts.
export async function listAccountsWithBalance(userId: string): Promise<AccountWithBalance[]> {
  const rows = await db.execute<{
    id: string;
    name: string;
    type: AccountWithBalance["type"];
    status: AccountWithBalance["status"];
    currency: string;
    balance: string;
    is_default: boolean;
  }>(sql`
    SELECT
      a.id, a.name, a.type, a.status, a.currency, a.is_default,
      CASE
        WHEN a.type = 'debt' THEN
          (a.initial_balance - COALESCE(SUM(t.amount) FILTER (WHERE t.kind = 'expense'), 0))::text
        WHEN a.type = 'receivable' THEN
          (a.initial_balance - COALESCE(SUM(t.amount) FILTER (WHERE t.kind = 'income'), 0))::text
        ELSE
          (a.initial_balance + COALESCE(SUM(
            CASE t.kind WHEN 'income' THEN t.amount WHEN 'expense' THEN -t.amount ELSE t.amount END
          ), 0))::text
      END AS balance
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
    isDefault: r.is_default,
  }));
}

/**
 * The user's default account id, or null when none is set. Scoped to active
 * accounts so an archived (but still flagged, defensively) row never surfaces.
 */
export async function getDefaultAccountId(userId: string): Promise<string | null> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT id FROM accounts
    WHERE user_id = ${userId} AND is_default AND status <> 'archived'
    LIMIT 1
  `);
  return rows.rows[0]?.id ?? null;
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

// Single-account variant of listAccountsWithBalance, ownership-scoped. Returns
// null when the id doesn't exist or belongs to another user (so the caller can
// 404 without leaking which case it was). `cache`d so the detail page's
// generateMetadata + render share one query per request.
export const getAccountWithBalance = cache(async function getAccountWithBalance(
  userId: string,
  id: string,
): Promise<AccountWithBalance | null> {
  const rows = await db.execute<{
    id: string;
    name: string;
    type: AccountWithBalance["type"];
    status: AccountWithBalance["status"];
    currency: string;
    balance: string;
    is_default: boolean;
  }>(sql`
    SELECT
      a.id, a.name, a.type, a.status, a.currency, a.is_default,
      CASE
        WHEN a.type = 'debt' THEN
          (a.initial_balance - COALESCE(SUM(t.amount) FILTER (WHERE t.kind = 'expense'), 0))::text
        WHEN a.type = 'receivable' THEN
          (a.initial_balance - COALESCE(SUM(t.amount) FILTER (WHERE t.kind = 'income'), 0))::text
        ELSE
          (a.initial_balance + COALESCE(SUM(
            CASE t.kind WHEN 'income' THEN t.amount WHEN 'expense' THEN -t.amount ELSE t.amount END
          ), 0))::text
      END AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
    WHERE a.user_id = ${userId} AND a.id = ${id}
    GROUP BY a.id
  `);

  const r = rows.rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    currency: r.currency,
    balance: Number(r.balance),
    isDefault: r.is_default,
  };
});

export type AccountMonthStats = { moneyIn: number; moneyOut: number };

// Money in/out for one account in the current ICT month. Filters on the generated
// `occurred_month_ict` bucket (the project's canonical month key) so no bespoke
// TZ math. Transfers are sign-less and excluded, matching the dashboard hero.
export async function getAccountMonthStats(userId: string, id: string): Promise<AccountMonthStats> {
  const rows = await db.execute<{ money_in: string; money_out: string }>(sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0)::text  AS money_in,
      COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0)::text AS money_out
    FROM transactions
    WHERE user_id = ${userId}
      AND account_id = ${id}
      AND occurred_month_ict = date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  `);

  const r = rows.rows[0];
  return { moneyIn: Number(r?.money_in ?? 0), moneyOut: Number(r?.money_out ?? 0) };
}
