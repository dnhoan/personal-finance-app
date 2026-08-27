import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the review queue.
export default function InboxLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-border p-3.5 last:border-b-0">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-48" />
            <SkeletonBlock className="h-6 w-56 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
