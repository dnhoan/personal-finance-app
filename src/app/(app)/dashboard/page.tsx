import Link from "next/link";
import type { Route } from "next";
import { requireSession } from "@/lib/auth-session";
import { listTransactions } from "@/features/transactions/queries";
import { listActiveAccounts } from "@/features/accounts/queries";
import { listCategoriesFlat } from "@/features/categories/queries";
import { listActiveGoals } from "@/features/goals/queries";
import {
  netCashFlowMtd,
  netWorthSnapshot,
  topCategoriesThisMonth,
  upcomingRenewals,
  cronHeartbeat,
} from "@/features/reports/queries";
import { HeroNetCashFlow } from "@/features/reports/components/hero-net-cash-flow";
import { NetWorthCard } from "@/features/reports/components/net-worth-card";
import { TopCategoriesCard } from "@/features/reports/components/top-categories-card";
import { UpcomingRenewalsCard } from "@/features/reports/components/upcoming-renewals-card";
import { CronStatusBadge } from "@/features/dashboard/components/cron-status-badge";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { QuickAddLauncher } from "@/features/transactions/components/quick-add-launcher";

export const metadata = { title: "Trang chủ · Personal Finance" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  // All independent reads fan out in one round-trip-bounded batch so total
  // latency ≈ the slowest query, not the sum (red-team F14).
  const [flow, netWorth, topCats, renewals, heartbeat, recent, accounts, categories, goals] =
    await Promise.all([
      netCashFlowMtd(user.id),
      netWorthSnapshot(user.id),
      topCategoriesThisMonth(user.id, 3),
      upcomingRenewals(user.id, 7),
      cronHeartbeat(),
      listTransactions(user.id, { limit: 8 }),
      listActiveAccounts(user.id),
      listCategoriesFlat(user.id),
      listActiveGoals(user.id),
    ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
          Trang chủ
        </h1>
        <Link href={"/reports/cash-flow" as Route} className="text-sm font-medium text-primary">
          Báo cáo
        </Link>
      </div>

      <HeroNetCashFlow flow={flow} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NetWorthCard snapshot={netWorth} />
        <TopCategoriesCard categories={topCats} />
        <UpcomingRenewalsCard renewals={renewals} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Giao dịch gần đây</h2>
          <Link href={"/transactions" as Route} className="text-sm font-medium text-primary">
            Xem tất cả
          </Link>
        </div>
        <TransactionList transactions={recent} accounts={accounts} />
      </section>

      <CronStatusBadge lastCheckedAt={heartbeat.lastCheckedAt} />

      <QuickAddLauncher accounts={accounts} categories={categories} goals={goals} />
    </div>
  );
}
