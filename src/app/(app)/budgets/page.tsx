import { requireSession } from "@/lib/auth-session";
import {
  parseMonthKey,
  monthStartDate,
  daysLeftInMonth,
  daysInMonth as getDaysInMonth,
  currentIctMonth,
} from "@/lib/month";
import { listBudgets, listBudgetableCategories } from "@/features/budgets/queries";
import { budgetStatus } from "@/features/budgets/lib/effective-budget";
import { MonthNavigator } from "@/features/budgets/components/month-navigator";
import { BudgetSummaryCard } from "@/features/budgets/components/budget-summary-card";
import { BudgetList } from "@/features/budgets/components/budget-list";

export const metadata = { title: "Ngân sách · Personal Finance" };

type SearchParams = Record<string, string | undefined>;

// Section entrance: a gentle staggered rise on load. `fill-mode-both` holds the
// pre-animation state so nothing flashes; `motion-reduce` drops it entirely.
const ENTER =
  "animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 motion-reduce:animate-none";

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

  const overallStatus = budgetStatus(summary.totalSpent, summary.totalEffective);
  const daysLeft = daysLeftInMonth(monthKey);
  const isCurrentMonth = monthKey === currentIctMonth();
  const hasBudgets = summary.totalEffective > 0;

  return (
    <div className="flex flex-col gap-5">
      <h1
        className={`text-2xl font-semibold text-fg ${ENTER}`}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Ngân sách
      </h1>

      <div className={ENTER} style={{ animationDelay: "60ms" }}>
        <MonthNavigator monthKey={monthKey} />
      </div>

      {/* The summary gauge only earns its space once a budget exists; otherwise
          the list's empty state below carries the call to action. */}
      {hasBudgets && (
        <div className={ENTER} style={{ animationDelay: "120ms" }}>
          <BudgetSummaryCard
            spent={summary.totalSpent}
            effective={summary.totalEffective}
            status={overallStatus}
            overCount={summary.overCount}
            approachingCount={summary.approachingCount}
            daysLeft={daysLeft}
            daysInMonth={getDaysInMonth(monthKey)}
            isCurrentMonth={isCurrentMonth}
          />
        </div>
      )}

      <div className={ENTER} style={{ animationDelay: hasBudgets ? "180ms" : "120ms" }}>
        <BudgetList
          rows={rows}
          budgetableCategories={budgetableCategories}
          periodMonth={periodMonth}
        />
      </div>
    </div>
  );
}
