import { AlertTriangle } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/features/categories/category-icons";
import type { BudgetRowData } from "../queries";
import { ProgressBar } from "./progress-bar";

const STATUS_TEXT_COLOR = {
  under: "text-fg-muted",
  approaching: "text-warning",
  over: "text-expense",
} as const;

// One budget row (tap to edit). Mirrors wireframe 08: icon + name + status line,
// progress bar, spent vs limit. Over-budget rows get a tinted bg + warning icon.
export function BudgetRow({ row, onEdit }: { row: BudgetRowData; onEdit: () => void }) {
  const Icon = getCategoryIcon(row.icon);
  const color = row.color ?? "#64748B";
  const pct =
    row.effectiveAmount > 0
      ? Math.round((row.spent / row.effectiveAmount) * 100)
      : row.spent > 0
        ? 100
        : 0;

  const statusText =
    row.status === "over"
      ? `Vượt ${formatVnd(row.spent - row.effectiveAmount)}`
      : row.status === "approaching"
        ? `Gần hạn · ${pct}%`
        : `Đúng hạn · ${pct}%`;

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "w-full p-4 text-left transition-colors hover:bg-surface-muted/60",
        row.status === "over" && "bg-expense-soft/40",
      )}
    >
      <div className="mb-2 flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">
            {row.parentName ? `${row.parentName} / ${row.name}` : row.name}
          </p>
          <p className={cn("text-[12px] tabular-nums", STATUS_TEXT_COLOR[row.status])}>
            {statusText}
            {row.rollover && row.rolloverDelta > 0
              ? ` · +${formatVnd(row.rolloverDelta)} chuyển sang`
              : ""}
          </p>
        </div>
        {row.status === "over" && (
          <AlertTriangle size={16} className="shrink-0 text-expense" aria-hidden="true" />
        )}
      </div>

      <ProgressBar
        ratio={row.ratio}
        status={row.status}
        label={`${row.name}: ${formatVnd(row.spent)} / ${formatVnd(row.effectiveAmount)}`}
      />

      <div className="mt-1.5 flex items-center justify-between text-[12px] tabular-nums">
        <span className={cn("font-semibold", row.status === "over" && "text-expense")}>
          {formatVnd(row.spent)}
        </span>
        <span className="text-fg-muted">hạn mức {formatVnd(row.effectiveAmount)}</span>
      </div>
    </button>
  );
}
