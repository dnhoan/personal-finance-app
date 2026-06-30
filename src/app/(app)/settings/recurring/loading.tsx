import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the recurring-rules page: the 30-day net summary card
// plus a list of rule rows. Shown the instant the "Định kỳ" settings row is tapped,
// before due-instance materialisation and the rule queries resolve.
export default function RecurringLoading() {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-2 h-9 w-1/2" />
        <SkeletonBlock className="mt-2 h-3 w-2/3" />
      </section>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="h-9 w-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            </div>
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
