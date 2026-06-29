import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the spending report: header, range picker bar, and
// the donut card (a round chart placeholder + a legend column).
export default function SpendingLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="h-10 w-full rounded-full" />
      </div>

      <div className="flex flex-col gap-1">
        <SkeletonBlock className="h-10 w-full rounded-full" />
        <SkeletonBlock className="ml-1 h-3 w-28" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-5 w-36" />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-[160px] w-[160px] shrink-0 self-center rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
