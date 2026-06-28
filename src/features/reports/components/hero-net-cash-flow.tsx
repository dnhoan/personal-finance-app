import { formatVnd } from "@/lib/vnd";
import { formatMonthLabel, currentIctMonth } from "@/lib/month";
import type { NetCashFlow } from "../queries";

const MINUS = "−"; // U+2212, matches the rest of the app's signed amounts.

// Dashboard hero: net cash flow month-to-date in Fraunces 40, signed + colored.
// Sub-line breaks out income vs expense. Server component — pure presentation.
export function HeroNetCashFlow({ flow }: { flow: NetCashFlow }) {
  const positive = flow.net >= 0;
  const sign = positive ? "+" : MINUS;
  const color = positive ? "text-income" : "text-expense";

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
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
    </section>
  );
}
