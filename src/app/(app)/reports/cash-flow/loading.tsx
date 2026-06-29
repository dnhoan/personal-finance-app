import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the cash-flow report: header (back + title + tabs),
// range picker bar, KPI row, and the chart card. Matches the real layout so the
// page does not jump when data arrives.
export default function CashFlowLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-10 w-full rounded-full" />
      </div>

      <div className="flex flex-col gap-1">
        <SkeletonBlock className="h-10 w-full rounded-full" />
        <SkeletonBlock className="ml-1 h-3 w-28" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SkeletonBlock className="h-16 rounded-2xl" />
        <SkeletonBlock className="h-16 rounded-2xl" />
        <SkeletonBlock className="h-16 rounded-2xl" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="mt-4 h-[200px] w-full rounded-xl" />
      </div>
    </div>
  );
}
