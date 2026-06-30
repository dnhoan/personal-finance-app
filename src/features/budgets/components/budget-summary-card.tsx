import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "../lib/effective-budget";

// Per-status visual language, shared by the glow, the track fill, and the pace
// dot so the whole card reads one mood: on track (sage), tight (amber), over
// (red).
const STATUS_STYLE: Record<BudgetStatus, { glow: string; fill: string; dot: string }> = {
  under: { glow: "bg-accent/20", fill: "bg-accent", dot: "bg-accent" },
  approaching: { glow: "bg-warning/25", fill: "bg-warning", dot: "bg-warning" },
  over: { glow: "bg-expense/25", fill: "bg-expense", dot: "bg-expense" },
};

// The month's budget at a glance. Leads with REMAINING money (the actionable
// number) rather than spent, and overlays a "today" marker on the spend track so
// spend pace vs. month pace is readable in one look: fill past the marker = you
// are spending faster than the month is elapsing.
export function BudgetSummaryCard({
  spent,
  effective,
  status,
  overCount,
  approachingCount,
  daysLeft,
  daysInMonth,
  isCurrentMonth,
}: {
  spent: number;
  effective: number;
  status: BudgetStatus;
  overCount: number;
  approachingCount: number;
  daysLeft: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
}) {
  const remaining = effective - spent;
  const isOver = remaining < 0;
  const spendRatio = effective > 0 ? spent / effective : 0;
  const spendPct = Math.round(spendRatio * 100);
  const fillPct = Math.min(100, Math.max(0, spendRatio * 100));

  // Month-pace marker: fraction of the month already elapsed (today included).
  // Only meaningful for the live month; past/future months hide the marker.
  const elapsed = daysInMonth - daysLeft;
  const timeRatio = daysInMonth > 0 ? elapsed / daysInMonth : 0;
  const timePct = Math.min(100, Math.max(0, timeRatio * 100));
  const showMarker = isCurrentMonth && effective > 0;

  // Pace verdict — compares spend pace to month pace with a small dead-band so a
  // few percent either way still reads as "on track".
  const pace = !showMarker
    ? null
    : isOver
      ? { text: "Đã vượt ngân sách tháng này", tone: "text-expense" }
      : spendRatio > timeRatio + 0.08
        ? {
            text: `Chi nhanh hơn nhịp — ${spendPct}% ngân sách sau ${Math.round(timeRatio * 100)}% tháng`,
            tone: "text-warning",
          }
        : spendRatio < timeRatio - 0.08
          ? { text: `Đang dư dả — mới dùng ${spendPct}% ngân sách`, tone: "text-income" }
          : { text: "Đúng nhịp chi tiêu", tone: "text-accent" };

  const s = STATUS_STYLE[status];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
      {/* Status-tinted glow gives the card its mood without shouting. Decorative. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl",
          s.glow,
        )}
      />

      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          {isOver ? "Đã vượt ngân sách" : "Còn lại để chi"}
        </p>
        <p
          className={cn(
            "mt-1 text-[34px] font-semibold leading-tight tabular-nums",
            isOver ? "text-expense" : "text-fg",
          )}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {isOver ? `−${formatVnd(-remaining)}` : formatVnd(remaining)}
        </p>
        <p className="mt-0.5 text-sm tabular-nums text-fg-muted">
          đã chi {formatVnd(spent)} / {formatVnd(effective)}
        </p>

        {/* Spend track with the month-pace marker layered on top. */}
        <div className="relative mt-4">
          <div
            role="progressbar"
            aria-valuenow={spendPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tổng ngân sách đã dùng"
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", s.fill)}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {showMarker && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${timePct}%` }}
            >
              <span className="absolute -top-[7px] left-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fg/55" />
              <span className="block h-4 w-0.5 -translate-x-1/2 rounded-full bg-fg/40" />
            </span>
          )}
        </div>

        {pace && (
          <p className={cn("mt-2.5 flex items-center gap-1.5 text-[12px] font-medium", pace.tone)}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
            {pace.text}
          </p>
        )}

        {/* Footer: time left on the left, trouble counts as chips on the right. */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[12px] text-fg-muted">
            {isCurrentMonth ? `Còn ${daysLeft} ngày trong tháng` : " "}
          </span>
          <span className="flex items-center gap-1.5">
            {overCount > 0 && (
              <span className="rounded-full bg-expense-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-expense">
                {overCount} vượt
              </span>
            )}
            {approachingCount > 0 && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-warning">
                {approachingCount} gần hạn
              </span>
            )}
            {overCount === 0 && approachingCount === 0 && (
              <span className="rounded-full bg-income-soft px-2 py-0.5 text-[11px] font-semibold text-income">
                Trong hạn mức
              </span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
