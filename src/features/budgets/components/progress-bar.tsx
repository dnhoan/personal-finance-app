import { cn } from "@/lib/utils";
import type { BudgetStatus } from "../lib/effective-budget";

const STATUS_FILL: Record<BudgetStatus, string> = {
  under: "bg-accent",
  approaching: "bg-warning",
  over: "bg-expense",
};

// Accessible budget progress bar. `ratio` is spent/effective clamped to [0,1];
// color tracks status (<80% accent, 80–100% warning, >100% expense).
export function ProgressBar({
  ratio,
  status,
  label,
}: {
  ratio: number;
  status: BudgetStatus;
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className={cn("h-full rounded-full", STATUS_FILL[status])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
