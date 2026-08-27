import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder: the SePay connection card (URL + key) above the list
// of linked bank accounts.
export default function BankSyncLoading() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <SkeletonBlock className="h-7 w-52" />
        <SkeletonBlock className="mt-2 h-4 w-full max-w-sm" />
      </div>

      <div className="flex flex-col gap-2.5">
        <SkeletonBlock className="ml-1 h-3 w-28" />
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-9 w-40" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <SkeletonBlock className="ml-1 h-3 w-40" />
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 border-b border-border p-3.5 last:border-b-0"
            >
              <SkeletonBlock className="h-4 w-44" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
