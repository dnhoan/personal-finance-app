import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for a transaction detail page: hero (icon + amount) and a
// short facts list. Shown the instant a ledger row is tapped, before the query
// resolves.
export default function TransactionDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <SkeletonBlock className="h-14 w-14 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-9 w-40" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
          >
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
