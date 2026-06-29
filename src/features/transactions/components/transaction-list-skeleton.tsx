// Greyed placeholder mirroring the day-grouped ledger (a faux day header + N
// 64px rows). Shown while a filter change's server round-trip is in flight.
// `animate-pulse` is disabled under prefers-reduced-motion.

const ROWS = 6;
const shimmer = "rounded bg-surface-muted animate-pulse motion-reduce:animate-none";

export function TransactionListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className={`h-3 w-28 ${shimmer}`} />
        <div className={`h-3 w-20 ${shimmer}`} />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: ROWS }).map((_, i) => (
          <li key={i} className="flex min-h-[64px] items-center gap-3 py-2">
            <span
              className={`h-10 w-10 shrink-0 rounded-full bg-surface-muted animate-pulse motion-reduce:animate-none`}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-3.5 w-2/5 ${shimmer}`} />
              <div className={`h-3 w-1/4 ${shimmer}`} />
            </div>
            <div className={`h-3.5 w-16 ${shimmer}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
