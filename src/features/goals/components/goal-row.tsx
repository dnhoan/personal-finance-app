"use client";
import {
  CalendarClock,
  Infinity as InfinityIcon,
  Pencil,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { GoalWithProgress } from "../queries";
import { daysUntil } from "../lib/days-remaining";

// SVG progress ring (radius 28, circumference ≈ 175.93), mirroring wireframe 10.
const R = 28;
const CIRC = 2 * Math.PI * R;

function targetDateLabel(targetDate: string | null): string {
  if (!targetDate) return "";
  const [y, m, d] = targetDate.split("-");
  return `${d}/${m}/${y}`;
}

// One goal card: progress ring + name + amount/target + a date/over-target pill,
// with edit and archive/restore actions. Tag savings to it from the quick-add sheet.
export function GoalRow({
  goal,
  onEdit,
  onArchive,
}: {
  goal: GoalWithProgress;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const pct = Math.round(goal.ratio * 100);
  const offset = CIRC * (1 - goal.ratio);
  const overshoot = goal.targetAmount > 0 && goal.progress > goal.targetAmount;
  const overPct = overshoot ? Math.round((goal.progress / goal.targetAmount - 1) * 100) : 0;
  const days = daysUntil(goal.targetDate);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-surface p-5",
        goal.archived && "opacity-70",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="var(--color-surface-muted)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
            {pct}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[18px] font-semibold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {goal.name}
          </p>
          {goal.accountName && (
            <p className="mt-0.5 text-[12px] text-fg-muted">Liên kết · {goal.accountName}</p>
          )}
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <p className="text-[16px] font-semibold">{formatVnd(goal.progress)}</p>
            <p className="text-[12px] text-fg-subtle">/ {formatVnd(goal.targetAmount)}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {goal.targetDate ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                <CalendarClock size={12} aria-hidden="true" />
                {days !== null && days >= 0
                  ? `Còn ${days} ngày · ${targetDateLabel(goal.targetDate)}`
                  : `Quá hạn · ${targetDateLabel(goal.targetDate)}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                <InfinityIcon size={12} aria-hidden="true" /> Không có hạn
              </span>
            )}
            {overshoot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-income-soft px-2 py-0.5 text-[11px] font-medium text-income">
                +{overPct}% vượt mục tiêu
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-muted text-[13px] font-semibold text-fg"
        >
          <Pencil size={16} aria-hidden="true" /> Sửa
        </button>
        <button
          type="button"
          onClick={onArchive}
          aria-label={goal.archived ? "Khôi phục mục tiêu" : "Lưu trữ mục tiêu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-fg-muted"
        >
          {goal.archived ? (
            <ArchiveRestore size={16} aria-hidden="true" />
          ) : (
            <Archive size={16} aria-hidden="true" />
          )}
        </button>
      </div>
    </article>
  );
}
