import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { monthStartDate, addMonths } from "@/lib/month";
import {
  effectiveBudget,
  rolloverDelta,
  budgetStatus,
  type BudgetStatus,
} from "./lib/effective-budget";

export type BudgetRowData = {
  categoryId: string;
  name: string;
  parentName: string | null;
  icon: string | null;
  color: string | null;
  amount: number;
  spent: number;
  rollover: boolean;
  effectiveAmount: number;
  rolloverDelta: number;
  status: BudgetStatus;
  /** Spent / effective, clamped to [0,1] for the progress bar width. */
  ratio: number;
};

export type BudgetSummary = {
  totalEffective: number;
  totalSpent: number;
  overCount: number;
  approachingCount: number;
};

type RawBudget = {
  category_id: string;
  name: string;
  parent_name: string | null;
  icon: string | null;
  color: string | null;
  amount: string;
  rollover: boolean;
  spent: string;
};

// Budget rows for a month: each budgeted (non-archived) expense category with its
// month-to-date spend. Spend buckets on `occurred_month_ict` (ICT month). Rollover
// budgets also pull the prior month to compute the carried-over effective amount.
export async function listBudgets(
  userId: string,
  monthKey: string,
): Promise<{ rows: BudgetRowData[]; summary: BudgetSummary }> {
  const month = monthStartDate(monthKey);
  const prevMonth = monthStartDate(addMonths(monthKey, -1));

  const current = await db.execute<RawBudget>(sql`
    SELECT
      b.category_id, c.name, pc.name AS parent_name, c.icon, c.color,
      b.amount::text AS amount, b.rollover,
      COALESCE(sp.spent, 0)::text AS spent
    FROM budgets b
    JOIN categories c ON c.id = b.category_id AND c.archived_at IS NULL
    LEFT JOIN categories pc ON pc.id = c.parent_id
    LEFT JOIN (
      SELECT category_id, SUM(amount) AS spent
      FROM transactions
      WHERE user_id = ${userId} AND kind = 'expense' AND occurred_month_ict = ${month}
      GROUP BY category_id
    ) sp ON sp.category_id = b.category_id
    WHERE b.user_id = ${userId} AND b.period_month = ${month}
    ORDER BY pc.name NULLS FIRST, c.name
  `);

  // Prior month (amount + spent) keyed by category, for rollover carry.
  const prior = await db.execute<{ category_id: string; amount: string; spent: string }>(sql`
    SELECT b.category_id, b.amount::text AS amount, COALESCE(sp.spent, 0)::text AS spent
    FROM budgets b
    LEFT JOIN (
      SELECT category_id, SUM(amount) AS spent
      FROM transactions
      WHERE user_id = ${userId} AND kind = 'expense' AND occurred_month_ict = ${prevMonth}
      GROUP BY category_id
    ) sp ON sp.category_id = b.category_id
    WHERE b.user_id = ${userId} AND b.period_month = ${prevMonth}
  `);
  const priorMap = new Map(
    prior.rows.map((r) => [r.category_id, { amount: Number(r.amount), spent: Number(r.spent) }]),
  );

  let totalEffective = 0;
  let totalSpent = 0;
  let overCount = 0;
  let approachingCount = 0;

  const rows: BudgetRowData[] = current.rows.map((r) => {
    const amount = Number(r.amount);
    const spent = Number(r.spent);
    const cur = { amount, rollover: r.rollover };
    const priorBudget = r.rollover ? (priorMap.get(r.category_id) ?? null) : null;
    const effectiveAmount = effectiveBudget(cur, priorBudget);
    const status = budgetStatus(spent, effectiveAmount);

    totalEffective += effectiveAmount;
    totalSpent += spent;
    if (status === "over") overCount++;
    else if (status === "approaching") approachingCount++;

    return {
      categoryId: r.category_id,
      name: r.name,
      parentName: r.parent_name,
      icon: r.icon,
      color: r.color,
      amount,
      spent,
      rollover: r.rollover,
      effectiveAmount,
      rolloverDelta: rolloverDelta(cur, priorBudget),
      status,
      ratio: effectiveAmount > 0 ? Math.min(1, spent / effectiveAmount) : spent > 0 ? 1 : 0,
    };
  });

  return {
    rows,
    summary: { totalEffective, totalSpent, overCount, approachingCount },
  };
}

export type BudgetableCategory = {
  id: string;
  name: string;
  parentName: string | null;
  icon: string | null;
  color: string | null;
};

// Expense categories (non-archived) that do NOT yet have a budget for the month —
// the options offered when adding a budget.
export async function listBudgetableCategories(
  userId: string,
  monthKey: string,
): Promise<BudgetableCategory[]> {
  const month = monthStartDate(monthKey);
  const rows = await db.execute<{
    id: string;
    name: string;
    parent_name: string | null;
    icon: string | null;
    color: string | null;
  }>(sql`
    SELECT c.id, c.name, pc.name AS parent_name, c.icon, c.color
    FROM categories c
    LEFT JOIN categories pc ON pc.id = c.parent_id
    WHERE c.user_id = ${userId}
      AND c.kind = 'expense'
      AND c.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM budgets b
        WHERE b.category_id = c.id AND b.user_id = ${userId} AND b.period_month = ${month}
      )
    ORDER BY pc.name NULLS FIRST, c.name
  `);
  return rows.rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentName: r.parent_name,
    icon: r.icon,
    color: r.color,
  }));
}
