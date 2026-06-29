import { formatVnd } from "@/lib/vnd";
import { formatMonthLabel, currentIctMonth } from "@/lib/month";
import { StatDelta } from "./stat-delta";
import type { NetCashFlow } from "../queries";

const MINUS = "−"; // U+2212, matches the rest of the app's signed amounts.

// Dashboard hero: net cash flow month-to-date in Fraunces 40, signed + colored.
// Sub-line breaks out income vs expense; an optional month-over-month delta sits
// below it. Elevated (e2) so it reads as the dominant card. Server component.
export function HeroNetCashFlow({ flow, previous }: { flow: NetCashFlow; previous?: NetCashFlow }) {
  const positive = flow.net >= 0;
  const sign = positive ? "+" : MINUS;
  const color = positive ? "text-income" : "text-expense";
  // Only compare when the previous month actually had flow — an empty prior month
  // (net 0, no activity) would otherwise render a misleading delta.
  const hasPrevious = previous != null && (previous.income !== 0 || previous.expense !== 0);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        Dòng tiền thuần · {formatMonthLabel(currentIctMonth())}
      </p>
      <p
        className={`mt-1 text-[40px] font-semibold leading-tight tabular-nums ${color}`}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {sign}
        {formatVnd(Math.abs(flow.net))}
      </p>
      <p className="mt-1 text-[13px] tabular-nums text-fg-muted">
        Thu nhập <span className="font-medium text-income">{formatVnd(flow.income)}</span> · Chi
        tiêu <span className="font-medium text-expense">{formatVnd(flow.expense)}</span>
      </p>
      {hasPrevious ? (
        <div className="mt-2">
          <StatDelta current={flow.net} previous={previous.net} label="so với tháng trước" />
        </div>
      ) : null}
    </section>
  );
}
