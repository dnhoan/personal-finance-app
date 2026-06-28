import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatVnd } from "@/lib/vnd";
import type { CategorySpend } from "../queries";

// Dashboard "top 3 expense categories this month" card. Each row shows a tinted
// category icon, name, and amount; links to the spending report. Empty-safe.
export function TopCategoriesCard({ categories }: { categories: CategorySpend[] }) {
  return (
    <Link
      href={"/reports/spending" as Route}
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-muted"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Chi nhiều nhất tháng này
        </p>
        <ChevronRight size={16} className="text-fg-subtle" aria-hidden="true" />
      </div>

      {categories.length === 0 ? (
        <p className="mt-3 text-[13px] text-fg-muted">Chưa có chi tiêu tháng này.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {categories.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            return (
              <li key={c.categoryId} className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-expense"
                  style={c.color ? { color: c.color } : undefined}
                  aria-hidden="true"
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{c.name}</span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-fg">
                  {formatVnd(c.total)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
