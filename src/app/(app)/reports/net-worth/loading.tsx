import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the net-worth report: header, the total card, and a
// couple of account-group lists.
export default function NetWorthLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="h-10 w-full rounded-full" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-3 w-52" />
        <SkeletonBlock className="mt-2 h-8 w-2/3" />
        <SkeletonBlock className="mt-2 h-3 w-1/2" />
      </div>

      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="flex flex-col gap-1">
          <SkeletonBlock className="ml-1 h-4 w-20" />
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
              >
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
