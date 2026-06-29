// Loading placeholders shared by the dashboard + report `loading.tsx` files. The
// shimmer class matches transactions/loading.tsx (animate-pulse on bg-surface-muted,
// disabled under prefers-reduced-motion) so skeletons read consistently app-wide.

const shimmer = "animate-pulse bg-surface-muted motion-reduce:animate-none";

/** A single greyed bar; size it with className (e.g. "h-8 w-2/3"). */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded ${shimmer} ${className}`} />;
}

/** A card-shaped placeholder: a label bar, a value bar, and a sub-line. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-border bg-surface p-5 ${className}`}
    >
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="mt-3 h-7 w-2/3" />
      <SkeletonBlock className="mt-2 h-3 w-1/2" />
    </div>
  );
}
