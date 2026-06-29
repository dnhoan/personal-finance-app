import { SkeletonBlock, SkeletonCard } from "@/features/reports/components/skeleton";
import { TransactionListSkeleton } from "@/features/transactions/components/transaction-list-skeleton";

// Cold-start placeholder for /dashboard. Mirrors the real layout (elevated hero,
// 3-up card grid, recent-transactions list) using the same grid/spacing classes
// so there is no layout shift when the server data arrives. The title is kept
// real (not a skeleton) to anchor the top of the page.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
          Trang chủ
        </h1>
      </div>

      <div
        aria-hidden="true"
        className="rounded-2xl border border-border bg-surface p-5 shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)]"
      >
        <SkeletonBlock className="h-3 w-44" />
        <SkeletonBlock className="mt-2 h-10 w-3/5" />
        <SkeletonBlock className="mt-2 h-3 w-1/2" />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>

      <section className="flex flex-col gap-2">
        <SkeletonBlock className="h-5 w-40" />
        <TransactionListSkeleton />
      </section>
    </div>
  );
}
