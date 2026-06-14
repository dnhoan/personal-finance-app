import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { parseMonthKey, monthStartDate, daysLeftInMonth, currentIctMonth } from "@/lib/month";
import { listBudgets, listBudgetableCategories } from "@/features/budgets/queries";
import { budgetStatus } from "@/features/budgets/lib/effective-budget";
import { MonthNavigator } from "@/features/budgets/components/month-navigator";
import { ProgressBar } from "@/features/budgets/components/progress-bar";
import { BudgetList } from "@/features/budgets/components/budget-list";

export const metadata = { title: "Ngân sách · Personal Finance" };

type SearchParams = Record<string, string | undefined>;

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const monthKey = parseMonthKey(sp.month);
  const periodMonth = monthStartDate(monthKey);

  const [{ rows, summary }, budgetableCategories] = await Promise.all([
    listBudgets(user.id, monthKey),
    listBudgetableCategories(user.id, monthKey),
  ]);

  const ratio = summary.totalEffective > 0 ? summary.totalSpent / summary.totalEffective : 0;
  const overallStatus = budgetStatus(summary.totalSpent, summary.totalEffective);
  const daysLeft = daysLeftInMonth(monthKey);
  const isCurrentMonth = monthKey === currentIctMonth();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Ngân sách
      </h1>

      <MonthNavigator monthKey={monthKey} />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Tổng ngân sách
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p
            className="text-3xl font-semibold tabular-nums"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatVnd(summary.totalSpent)}
          </p>
          <p className="text-sm tabular-nums text-fg-muted">
            / {formatVnd(summary.totalEffective)}
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar ratio={ratio} status={overallStatus} label="Tổng ngân sách" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-fg-muted">{isCurrentMonth ? `Còn ${daysLeft} ngày` : " "}</span>
          <span className="font-medium tabular-nums text-expense">
            {summary.overCount > 0 || summary.approachingCount > 0
              ? `${summary.overCount} vượt · ${summary.approachingCount} gần`
              : " "}
          </span>
        </div>
      </section>

      <BudgetList
        rows={rows}
        budgetableCategories={budgetableCategories}
        periodMonth={periodMonth}
      />
    </div>
  );
}
