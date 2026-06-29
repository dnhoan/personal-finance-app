import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { MAX_MONTHS_BACK } from "./lib/range-presets";

// Month-by-month net worth, derived ON READ from transaction history — no
// snapshot table, no migration, no backfill. Per-account balance at the end of
// month M = initial_balance adjusted by the type-specific signed sum of every
// transaction with occurred_month_ict <= M, mirroring EXACTLY the CASE logic in
// listAccountsWithBalance (debt counts down via expense, receivable via income,
// spending accounts net income−expense with already-signed transfers). Accounts
// are then grouped by the groupAccounts convention (assets vs debts) in SQL.
//
// Correctness gate: the latest month's `net` must equal netWorthSnapshot(userId).net
// — same convention, asserted in tests.
//
// Limitation (acceptable at single-user scale): an account is included for the
// whole window using its CURRENT status, so an account archived today is excluded
// from past months too, and an account created mid-history contributes only its
// initial_balance to months before its first transaction.

export type NetWorthTrendPoint = {
  /** "YYYY-MM" ICT month key. */
  monthKey: string;
  /** assets − outstanding debts (matches NetWorthSnapshot.net). */
  net: number;
  /** Asset accounts subtotal (positive). */
  assets: number;
  /** Liabilities subtotal: the NEGATIVE net-worth contribution of debts. */
  liabilities: number;
};

export async function netWorthTrend(userId: string, months = 12): Promise<NetWorthTrendPoint[]> {
  const window = Math.min(Math.max(1, Math.trunc(months)), MAX_MONTHS_BACK);

  const rows = await db.execute<{
    month_key: string;
    assets: string;
    liabilities: string;
    net: string;
  }>(sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - make_interval(months => ${window - 1}),
        date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        interval '1 month'
      )::date AS month_start
    ),
    acct AS (
      SELECT a.id, a.type, a.initial_balance, a.user_id
      FROM accounts a
      WHERE a.user_id = ${userId} AND a.status <> 'archived'
    ),
    per_account AS (
      SELECT
        m.month_start,
        a.type,
        a.initial_balance + COALESCE(SUM(
          CASE
            WHEN a.type = 'debt'       THEN CASE WHEN t.kind = 'expense' THEN -t.amount ELSE 0 END
            WHEN a.type = 'receivable' THEN CASE WHEN t.kind = 'income'  THEN -t.amount ELSE 0 END
            ELSE CASE t.kind WHEN 'income' THEN t.amount WHEN 'expense' THEN -t.amount ELSE t.amount END
          END
        ) FILTER (WHERE t.occurred_month_ict <= m.month_start), 0) AS balance
      FROM months m
      CROSS JOIN acct a
      LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
      GROUP BY m.month_start, a.id, a.type, a.initial_balance
    )
    SELECT
      to_char(month_start, 'YYYY-MM') AS month_key,
      COALESCE(SUM(balance) FILTER (WHERE type <> 'debt'), 0)::text                            AS assets,
      (-COALESCE(SUM(balance) FILTER (WHERE type = 'debt'), 0))::text                          AS liabilities,
      (COALESCE(SUM(balance) FILTER (WHERE type <> 'debt'), 0)
        - COALESCE(SUM(balance) FILTER (WHERE type = 'debt'), 0))::text                        AS net
    FROM per_account
    GROUP BY month_start
    ORDER BY month_start ASC
  `);

  return rows.rows.map((r) => ({
    monthKey: r.month_key,
    assets: Number(r.assets),
    liabilities: Number(r.liabilities),
    net: Number(r.net),
  }));
}
