import { User, ArrowDownLeft } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { DebtRowData } from "../queries";
import type { DebtStatus } from "../lib/debt-status";

const STATUS_LABEL: Record<DebtStatus, string> = {
  open: "Đang mở",
  partial: "Một phần",
  settled: "Đã trả",
};

const STATUS_PILL: Record<DebtStatus, string> = {
  open: "bg-expense-soft text-expense",
  partial: "bg-warning/15 text-warning",
  settled: "bg-income-soft text-income",
};

// One debt/receivable card (wireframe 11). `owing` shows remaining in expense red;
// `owed` (receivable) shows the amount to collect in income green. Progress bar
// tracks the settled fraction; status pill auto-derives from remaining balance.
export function DebtRow({ debt }: { debt: DebtRowData }) {
  const isOwed = debt.direction === "owed";
  const amountColor = isOwed ? "text-income" : "text-expense";
  const barColor =
    debt.status === "partial"
      ? "var(--color-warning)"
      : isOwed
        ? "var(--color-income)"
        : "var(--color-expense)";
  // Partial/settled tone the same for both directions; only an `open` receivable
  // reads green (a healthy asset to collect) rather than debt-red.
  const pillClass =
    isOwed && debt.status === "open" ? "bg-income-soft text-income" : STATUS_PILL[debt.status];

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isOwed ? (
              <ArrowDownLeft size={16} className="text-income" aria-hidden="true" />
            ) : (
              <User size={16} className="text-fg-muted" aria-hidden="true" />
            )}
            <p
              className="truncate text-[18px] font-semibold"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {debt.name}
            </p>
          </div>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {isOwed ? "Người khác nợ bạn" : "Bạn đang nợ"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            pillClass,
          )}
        >
          {STATUS_LABEL[debt.status]}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={Math.round(debt.ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${debt.name}: đã trả ${formatVnd(debt.paid)} / ${formatVnd(debt.initial)}`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(debt.ratio * 100)}%`, background: barColor }}
        />
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-fg-subtle">
            {isOwed ? "Cần thu" : "Còn lại"}
          </p>
          <p className={cn("text-[20px] font-semibold tabular-nums", amountColor)}>
            {isOwed ? "+ " : "− "}
            {formatVnd(debt.remaining)}
          </p>
          <p className="text-[12px] tabular-nums text-fg-subtle">của {formatVnd(debt.initial)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Đã trả</p>
          <p className="text-[14px] font-semibold tabular-nums text-fg">{formatVnd(debt.paid)}</p>
        </div>
      </div>
    </article>
  );
}
