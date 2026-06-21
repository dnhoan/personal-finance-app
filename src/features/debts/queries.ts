import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { debtStatus, debtPaidRatio, type DebtStatus } from "./lib/debt-status";

// A debt (`type='debt'`) is money you owe — paid down by EXPENSE tx on the account.
// A receivable (`type='receivable'`) is money owed to you — collected by INCOME tx.
// Either way `remaining = initial − paid`, where `paid` sums the settling kind.

export type DebtDirection = "owing" | "owed";

export type DebtRowData = {
  id: string;
  name: string;
  direction: DebtDirection;
  /** Total originally owed/lent (whole VND). */
  initial: number;
  /** Settled so far (whole VND). */
  paid: number;
  /** initial − paid, clamped at 0 floor for display. */
  remaining: number;
  status: DebtStatus;
  /** paid / initial, clamped [0,1], for the progress bar. */
  ratio: number;
};

export type DebtsView = {
  rows: DebtRowData[];
  summary: {
    /** Sum of remaining across all `owing` debts (you still owe). */
    totalOwing: number;
    /** Sum of remaining across all `owed` receivables (others owe you). */
    totalOwed: number;
    owingActive: number;
    owedActive: number;
  };
};

// All debt + receivable accounts with computed remaining/status in one roundtrip.
// `paid` sums only the settling kind for each direction (expense for debt, income
// for receivable) via a FILTERed aggregate.
export async function listDebtsWithBalance(userId: string): Promise<DebtsView> {
  const result = await db.execute<{
    id: string;
    name: string;
    type: "debt" | "receivable";
    initial_balance: string;
    paid: string;
  }>(sql`
    SELECT
      a.id, a.name, a.type, a.initial_balance::text AS initial_balance,
      COALESCE(SUM(t.amount) FILTER (
        WHERE (a.type = 'debt' AND t.kind = 'expense')
           OR (a.type = 'receivable' AND t.kind = 'income')
      ), 0)::text AS paid
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
    WHERE a.user_id = ${userId}
      AND a.type IN ('debt', 'receivable')
      AND a.status <> 'archived'
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `);

  let totalOwing = 0;
  let totalOwed = 0;
  let owingActive = 0;
  let owedActive = 0;

  const rows = result.rows.map((r) => {
    const direction: DebtDirection = r.type === "debt" ? "owing" : "owed";
    const initial = Number(r.initial_balance);
    const paid = Number(r.paid);
    const remainingRaw = initial - paid;
    const remaining = Math.max(0, remainingRaw);
    const status = debtStatus(remainingRaw, initial);

    if (status !== "settled") {
      if (direction === "owing") {
        totalOwing += remaining;
        owingActive++;
      } else {
        totalOwed += remaining;
        owedActive++;
      }
    }

    return {
      id: r.id,
      name: r.name,
      direction,
      initial,
      paid,
      remaining,
      status,
      ratio: debtPaidRatio(remainingRaw, initial),
    };
  });

  return {
    rows,
    summary: { totalOwing, totalOwed, owingActive, owedActive },
  };
}
