import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// Progress is ALWAYS computed from the ledger — there is no denormalised
// current_amount column, so deletes/back-dates can never drift. Single-user MVP
// scale (<100 tagged tx per goal) makes the SUM trivially cheap; the
// transactions(goal_id, user_id) index backs it.

// Sum of amounts tagged to one goal. Kind-agnostic by design (any tagged tx
// counts) — matches the "manual marking" model.
export async function getGoalProgress(goalId: string, userId: string): Promise<number> {
  const rows = await db.execute<{ progress: string }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS progress
    FROM transactions
    WHERE goal_id = ${goalId} AND user_id = ${userId}
  `);
  return Number(rows.rows[0]?.progress ?? 0);
}

export type GoalWithProgress = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  accountId: string | null;
  accountName: string | null;
  archived: boolean;
  /** SUM of tagged tx amounts, computed at read time. */
  progress: number;
  /** progress / target, clamped to [0,1] for the ring/bar. */
  ratio: number;
};

export type GoalsView = {
  goals: GoalWithProgress[];
  summary: { totalProgress: number; totalTarget: number; activeCount: number };
};

// All goals (active + archived) with computed progress in ONE roundtrip. The
// subquery aggregates tagged tx per goal; LEFT JOIN keeps zero-progress goals.
export async function listGoalsWithProgress(userId: string): Promise<GoalsView> {
  const rows = await db.execute<{
    id: string;
    name: string;
    target_amount: string;
    target_date: string | null;
    account_id: string | null;
    account_name: string | null;
    archived_at: string | null;
    progress: string;
  }>(sql`
    SELECT
      g.id, g.name, g.target_amount::text AS target_amount, g.target_date,
      g.account_id, a.name AS account_name, g.archived_at,
      COALESCE(p.progress, 0)::text AS progress
    FROM goals g
    LEFT JOIN accounts a ON a.id = g.account_id
    LEFT JOIN (
      SELECT goal_id, SUM(amount) AS progress
      FROM transactions
      WHERE user_id = ${userId} AND goal_id IS NOT NULL
      GROUP BY goal_id
    ) p ON p.goal_id = g.id
    WHERE g.user_id = ${userId}
    ORDER BY g.archived_at NULLS FIRST, g.created_at ASC
  `);

  let totalProgress = 0;
  let totalTarget = 0;
  let activeCount = 0;

  const goalsView = rows.rows.map((r) => {
    const targetAmount = Number(r.target_amount);
    const progress = Number(r.progress);
    const archived = r.archived_at !== null;
    if (!archived) {
      totalProgress += progress;
      totalTarget += targetAmount;
      activeCount++;
    }
    return {
      id: r.id,
      name: r.name,
      targetAmount,
      targetDate: r.target_date,
      accountId: r.account_id,
      accountName: r.account_name,
      archived,
      progress,
      ratio: targetAmount > 0 ? Math.min(1, progress / targetAmount) : progress > 0 ? 1 : 0,
    };
  });

  return {
    goals: goalsView,
    summary: { totalProgress, totalTarget, activeCount },
  };
}

// Active (non-archived) goals for the quick-add picker.
export async function listActiveGoals(userId: string): Promise<{ id: string; name: string }[]> {
  const rows = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM goals
    WHERE user_id = ${userId} AND archived_at IS NULL
    ORDER BY created_at ASC
  `);
  return rows.rows;
}
