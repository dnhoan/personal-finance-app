import { CalendarClock } from "lucide-react";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatVnd } from "@/lib/vnd";
import type { UpcomingRenewal } from "../queries";

const MINUS = "−";

function fmtShort(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

// Dashboard strip of recurring rules due in the next 7 days. Shows category icon,
// name/note, due date, and signed amount. Empty-safe with a calm placeholder.
export function UpcomingRenewalsCard({ renewals }: { renewals: UpcomingRenewal[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        Sắp đến hạn (7 ngày)
      </p>

      {renewals.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-fg-muted">
          <CalendarClock size={16} aria-hidden="true" /> Không có khoản nào sắp đến hạn.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {renewals.map((r) => {
            const Icon = getCategoryIcon(r.categoryIcon);
            const isIncome = r.kind === "income";
            const title = r.categoryName ?? r.note ?? (isIncome ? "Thu nhập" : "Chi tiêu");
            return (
              <li key={r.id} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted ${isIncome ? "text-income" : "text-expense"}`}
                  style={r.categoryColor ? { color: r.categoryColor } : undefined}
                  aria-hidden="true"
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-fg">{title}</span>
                  <span className="block text-[12px] text-fg-subtle">
                    Hạn {fmtShort(r.nextDue)}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[14px] font-semibold tabular-nums ${isIncome ? "text-income" : "text-expense"}`}
                >
                  {isIncome ? "+" : MINUS}
                  {formatVnd(r.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
