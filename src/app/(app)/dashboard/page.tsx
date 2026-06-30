import Link from "next/link";
import type { Route } from "next";
import { Wallet } from "lucide-react";
import { requireSession } from "@/lib/auth-session";
import { listTransactions } from "@/features/transactions/queries";
import { listActiveAccounts, getDefaultAccountId } from "@/features/accounts/queries";
import { listCategoriesFlat, getDefaultCategoryIds } from "@/features/categories/queries";
import { resolveDefaultAccountId } from "@/features/transactions/lib/resolve-default-account";
import { listActiveGoals } from "@/features/goals/queries";
import {
  netCashFlowMoM,
  netWorthSnapshot,
  topCategoriesThisMonth,
  upcomingRenewals,
  cronHeartbeat,
} from "@/features/reports/queries";
import { netWorthTrend } from "@/features/reports/net-worth-trend-query";
import { HeroNetCashFlow } from "@/features/reports/components/hero-net-cash-flow";
import { NetWorthCard } from "@/features/reports/components/net-worth-card";
import { TopCategoriesCard } from "@/features/reports/components/top-categories-card";
import { UpcomingRenewalsCard } from "@/features/reports/components/upcoming-renewals-card";
import { SectionTitle } from "@/features/reports/components/section-title";
import { EmptyState } from "@/features/reports/components/empty-state";
import { CronStatusBadge } from "@/features/dashboard/components/cron-status-badge";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { QuickAddLauncher } from "@/features/transactions/components/quick-add-launcher";

export const metadata = { title: "Trang chủ · Personal Finance" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  // All independent reads fan out in one round-trip-bounded batch so total
  // latency ≈ the slowest query, not the sum (red-team F14).
  const [
    flow,
    netWorth,
    netWorthSpark,
    topCats,
    renewals,
    heartbeat,
    recent,
    accounts,
    categories,
    goals,
    explicitDefaultAccountId,
    defaultCategoryByKind,
  ] = await Promise.all([
    netCashFlowMoM(user.id),
    netWorthSnapshot(user.id),
    netWorthTrend(user.id, 7),
    topCategoriesThisMonth(user.id, 3),
    upcomingRenewals(user.id, 7),
    cronHeartbeat(),
    listTransactions(user.id, { limit: 8 }),
    listActiveAccounts(user.id),
    listCategoriesFlat(user.id),
    listActiveGoals(user.id),
    getDefaultAccountId(user.id),
    getDefaultCategoryIds(user.id),
  ]);

  const defaultAccountId = resolveDefaultAccountId(explicitDefaultAccountId, accounts) ?? undefined;

  // First run: no accounts AND no transactions. Gate on accounts too so a user
  // who deleted every transaction but kept an account still sees the metric layout.
  const firstRun = accounts.length === 0 && recent.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
          Trang chủ
        </h1>
        {!firstRun && (
          <Link href={"/reports/cash-flow" as Route} className="text-sm font-medium text-primary">
            Báo cáo
          </Link>
        )}
      </div>

      {firstRun ? (
        <EmptyState
          icon={<Wallet size={32} strokeWidth={1.5} />}
          title="Bắt đầu theo dõi tài chính"
          description="Thêm tài khoản đầu tiên để ghi lại thu chi và xem dòng tiền của bạn."
          cta={{ href: "/accounts" as Route, label: "Thêm tài khoản" }}
        />
      ) : (
        <>
          <HeroNetCashFlow flow={flow.current} previous={flow.previous} />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <NetWorthCard snapshot={netWorth} trend={netWorthSpark} />
            <TopCategoriesCard categories={topCats} />
            <UpcomingRenewalsCard renewals={renewals} />
          </section>

          <section className="flex flex-col gap-2">
            <SectionTitle
              action={
                <Link href={"/transactions" as Route} className="text-sm font-medium text-primary">
                  Xem tất cả
                </Link>
              }
            >
              Giao dịch gần đây
            </SectionTitle>
            <TransactionList transactions={recent} accounts={accounts} />
          </section>
        </>
      )}

      <div className="mt-2 border-t border-border pt-4">
        <CronStatusBadge lastCheckedAt={heartbeat.lastCheckedAt} />
      </div>

      <QuickAddLauncher
        accounts={accounts}
        categories={categories}
        goals={goals}
        defaultAccountId={defaultAccountId}
        defaultCategoryByKind={defaultCategoryByKind}
      />
    </div>
  );
}
