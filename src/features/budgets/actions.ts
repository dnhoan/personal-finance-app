"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { budgets, categories } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { addMonths } from "@/lib/month";
import {
  upsertBudgetSchema,
  deleteBudgetSchema,
  copyFromLastMonthSchema,
  type UpsertBudgetInput,
} from "./schemas";

function revalidateBudgetViews() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

// Sets (or updates) the monthly limit + rollover for one category. Idempotent on
// the (user, category, period) unique index.
export async function upsertBudget(input: UpsertBudgetInput): Promise<void> {
  const { user } = await requireSession();
  const data = upsertBudgetSchema.parse(input);

  // Category must belong to the user and be an expense category.
  const [cat] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, data.categoryId), eq(categories.userId, user.id)));
  if (!cat) throw new Error("Danh mục không tồn tại");
  if (cat.kind !== "expense") throw new Error("Chỉ đặt ngân sách cho danh mục chi tiêu");

  await db
    .insert(budgets)
    .values({
      userId: user.id,
      categoryId: data.categoryId,
      periodMonth: data.periodMonth,
      amount: String(data.amount),
      rollover: data.rollover,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.periodMonth],
      set: { amount: String(data.amount), rollover: data.rollover, updatedAt: new Date() },
    });

  revalidateBudgetViews();
}

export async function deleteBudget(input: {
  categoryId: string;
  periodMonth: string;
}): Promise<void> {
  const { user } = await requireSession();
  const data = deleteBudgetSchema.parse(input);

  await db
    .delete(budgets)
    .where(
      and(
        eq(budgets.userId, user.id),
        eq(budgets.categoryId, data.categoryId),
        eq(budgets.periodMonth, data.periodMonth),
      ),
    );

  revalidateBudgetViews();
}

// Bulk-copies the prior month's NON-rollover budgets into `periodMonth`. Rollover
// budgets are skipped — they auto-carry via the effective-budget logic, so copying
// would double-count. Existing rows for the month are left untouched (DO NOTHING).
export async function copyFromLastMonth(input: {
  periodMonth: string;
}): Promise<{ copied: number }> {
  const { user } = await requireSession();
  const { periodMonth } = copyFromLastMonthSchema.parse(input);
  const prevMonth = `${addMonths(periodMonth.slice(0, 7), -1)}-01`;

  const result = await db.execute<{ category_id: string }>(sql`
    INSERT INTO budgets (user_id, category_id, period_month, amount, rollover)
    SELECT user_id, category_id, ${periodMonth}, amount, rollover
    FROM budgets
    WHERE user_id = ${user.id} AND period_month = ${prevMonth} AND rollover = false
    ON CONFLICT (user_id, category_id, period_month) DO NOTHING
    RETURNING category_id
  `);

  revalidateBudgetViews();
  return { copied: result.rows.length };
}
