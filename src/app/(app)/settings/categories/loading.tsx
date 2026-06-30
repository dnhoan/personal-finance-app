import { SkeletonBlock } from "@/features/reports/components/skeleton";

// Cold-start placeholder for the categories page: a month-total card plus the
// expense and income group lists. Shown the instant the "Danh mục" settings row
// is tapped, before the category tree queries resolve.
export default function CategoriesLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="mt-2 h-8 w-2/3" />
      </div>

      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="flex flex-col gap-1">
          <SkeletonBlock className="ml-1 h-4 w-24" />
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <SkeletonBlock className="h-9 w-9 rounded-full" />
                <SkeletonBlock className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
