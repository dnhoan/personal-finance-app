import { formatVnd } from "@/lib/vnd";
import { formatMonthLabel, currentIctMonth } from "@/lib/month";
import { StatDelta } from "./stat-delta";
import type { NetCashFlow } from "../queries";

const MINUS = "−"; // U+2212, matches the rest of the app's signed amounts.

// Dashboard hero: net cash flow month-to-date in Fraunces 40, signed + colored —
// the page's signature element. A status-tinted glow (green when in surplus, red
// when in deficit) gives it mood without shouting, and a proportional split bar
// turns the income-vs-expense pair into a ratio readable at a glance. Server
// component.
export function HeroNetCashFlow({ flow, previous }: { flow: NetCashFlow; previous?: NetCashFlow }) {
  const positive = flow.net >= 0;
  const sign = positive ? "+" : MINUS;
  const color = positive ? "text-income" : "text-expense";
  // Only compare when the previous month actually had flow — an empty prior month
  // (net 0, no activity) would otherwise render a misleading delta.
  const hasPrevious = previous != null && (previous.income !== 0 || previous.expense !== 0);

  // Split bar is only meaningful with activity; the income share drives both
  // segment widths so they always sum to the full track.
  const gross = flow.income + flow.expense;
  const hasActivity = gross > 0;
  const incomeShare = hasActivity ? (flow.income / gross) * 100 : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)]">
      {/* Surplus/deficit-tinted glow — decorative, echoes the budget summary card. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl ${
          positive ? "bg-income/15" : "bg-expense/15"
        }`}
      />

      <div className="relative">
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

        {hasActivity ? (
          <>
            <div
              className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
              aria-hidden="true"
            >
              <div className="h-full bg-income" style={{ width: `${incomeShare}%` }} />
              <div className="h-full bg-expense" style={{ width: `${100 - incomeShare}%` }} />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px] tabular-nums">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2 w-2 shrink-0 rounded-full bg-income" aria-hidden="true" />
                Thu <span className="font-medium text-income">{formatVnd(flow.income)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-fg-muted">
                Chi <span className="font-medium text-expense">{formatVnd(flow.expense)}</span>
                <span className="h-2 w-2 shrink-0 rounded-full bg-expense" aria-hidden="true" />
              </span>
            </div>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-fg-muted">Chưa có giao dịch tháng này.</p>
        )}

        {hasPrevious ? (
          <div className="mt-3">
            <StatDelta current={flow.net} previous={previous.net} label="so với tháng trước" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
