import { SkeletonBlock, SkeletonCard } from "@/features/reports/components/skeleton";

// Cold-start placeholder for an account detail page: gradient hero + action pills,
// this-month money in/out, and a short transaction history. Shown the instant an
// account card is tapped, before the per-account queries resolve.
export default function AccountDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="mt-3 h-9 w-2/3" />
        <div className="mt-4 flex gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-full" />
          <SkeletonBlock className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <section>
        <SkeletonBlock className="mb-2 ml-1 h-3 w-16" />
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-9 w-9 rounded-full" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
              <SkeletonBlock className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
