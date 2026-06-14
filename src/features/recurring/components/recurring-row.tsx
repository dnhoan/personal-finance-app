"use client";
import { AlarmClock, Calendar, Repeat, Bell, BellOff, PauseCircle } from "lucide-react";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { RecurringRuleItem } from "../queries";

const MINUS = "−"; // U+2212

function fmtShort(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

// Rule card: tinted icon, name + amount, category·account meta, and a pill row
// (next due / cadence / alert lead). The whole card opens the edit sheet.
export function RecurringRow({
  rule,
  onEdit,
}: {
  rule: RecurringRuleItem;
  onEdit: (rule: RecurringRuleItem) => void;
}) {
  const Icon = rule.categoryIcon ? getCategoryIcon(rule.categoryIcon) : Repeat;
  const isIncome = rule.kind === "income";
  const amountText = `${isIncome ? "+" : MINUS}${formatVnd(rule.amount)}`;
  const title = rule.categoryName ?? rule.note ?? (isIncome ? "Thu nhập" : "Chi tiêu");
  const nextDate = rule.nextDates[0] ?? rule.nextDue;
  const meta = rule.categoryName ? `${rule.categoryName} · ${rule.accountName}` : rule.accountName;

  return (
    <button
      type="button"
      onClick={() => onEdit(rule)}
      className={cn(
        "w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-muted",
        !rule.active && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted",
            isIncome ? "text-income" : "text-expense",
          )}
          style={rule.categoryColor ? { color: rule.categoryColor } : undefined}
          aria-hidden="true"
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-fg">{title}</p>
            <p
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                isIncome ? "text-income" : "text-expense",
              )}
            >
              {amountText}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-fg-muted">{meta}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!rule.active ? (
              <Pill className="bg-surface-muted text-fg-subtle">
                <PauseCircle size={12} aria-hidden="true" /> Tạm dừng
              </Pill>
            ) : rule.dueSoon ? (
              <Pill className="bg-amber-100 text-amber-800">
                <AlarmClock size={12} aria-hidden="true" /> Đến hạn {fmtShort(nextDate)}
              </Pill>
            ) : (
              <Pill>
                <Calendar size={12} aria-hidden="true" /> Hạn {fmtShort(nextDate)}
              </Pill>
            )}
            <Pill>
              <Repeat size={12} aria-hidden="true" /> {rule.description}
            </Pill>
            <Pill>
              {rule.leadDays > 0 ? (
                <>
                  <Bell size={12} aria-hidden="true" /> Nhắc trước {rule.leadDays} ngày
                </>
              ) : (
                <>
                  <BellOff size={12} aria-hidden="true" /> Không nhắc
                </>
              )}
            </Pill>
          </div>
        </div>
      </div>
    </button>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
