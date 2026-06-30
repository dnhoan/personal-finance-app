import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { compactVnd } from "@/features/reports/components/chart-theme";
import { cashFlowSeries } from "@/features/reports/queries";
import {
  getRange,
  parsePreset,
  defaultGranularity,
  formatRangeLabel,
} from "@/features/reports/lib/range-presets";
import { ReportPageHeader } from "@/features/reports/components/report-page-header";
import { RangePicker } from "@/features/reports/components/range-picker";
import { CashFlowChart } from "@/features/reports/components/cash-flow-chart";
import { ChartDataTable } from "@/features/reports/components/chart-data-table";
import { EmptyState } from "@/features/reports/components/empty-state";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Dòng tiền · Báo cáo" };

type SearchParams = Record<string, string | undefined>;

export default async function CashFlowReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const preset = parsePreset(sp.range);
  const range = getRange(preset, new Date(), { from: sp.from, to: sp.to });
  const granularity = defaultGranularity(preset);
  const series = await cashFlowSeries(user.id, range, granularity);

  const totalIncome = series.reduce((s, b) => s + b.income, 0);
  const totalExpense = series.reduce((s, b) => s + b.expense, 0);
  const net = totalIncome - totalExpense;
  // Average net per bucket — the reference line on the chart and the sub-line on
  // the net KPI both read against it. Rounded to whole VND for display.
  const avgNet = series.length ? Math.round(net / series.length) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className={ENTER}>
        <ReportPageHeader title="Dòng tiền" active="cash-flow" />
      </div>
      <div className={`flex flex-col gap-1 ${ENTER}`} style={enterDelay(60)}>
        <RangePicker />
        <p className="px-1 text-[12px] text-fg-subtle">{formatRangeLabel(range)}</p>
      </div>

      <section className={`grid grid-cols-3 gap-2 ${ENTER}`} style={enterDelay(120)}>
        <Kpi label="Vào" value={formatVnd(totalIncome)} tone="income" />
        <Kpi label="Ra" value={formatVnd(totalExpense)} tone="expense" />
        <Kpi
          label="Thuần"
          value={formatVnd(net)}
          tone={net >= 0 ? "income" : "expense"}
          sub={series.length ? `TB/kỳ ${compactVnd(avgNet)}` : undefined}
        />
      </section>

      <section
        className={`rounded-2xl border border-border bg-surface p-5 ${ENTER}`}
        style={enterDelay(180)}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Dòng tiền</h2>
          <span className="text-[11px] text-fg-subtle">Không gồm chuyển khoản</span>
        </div>
        {series.length === 0 ? (
          <EmptyState
            bare
            title="Chưa có dữ liệu"
            description="Chưa có giao dịch nào trong kỳ này."
            cta={{ href: "/transactions", label: "Thêm giao dịch" }}
          />
        ) : (
          <CashFlowChart data={series} granularity={granularity} avgNet={avgNet} />
        )}
        <ChartDataTable
          caption={
            series.length
              ? `Dòng tiền theo kỳ — trung bình thuần ${formatVnd(avgNet)}`
              : "Dòng tiền theo kỳ"
          }
          columns={[
            { key: "income", label: "Thu nhập" },
            { key: "expense", label: "Chi tiêu" },
            { key: "net", label: "Thuần" },
          ]}
          rows={series.map((b) => ({
            label: b.bucket,
            values: { income: b.income, expense: b.expense, net: b.net },
          }))}
        />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
  sub?: string;
}) {
  // Static class strings — Tailwind's JIT can't see runtime-built `text-${tone}`.
  const toneClass = tone === "income" ? "text-income" : "text-expense";
  return (
    // min-w-0 lets the grid cell shrink below its content's intrinsic width;
    // without it the long VND value forces the grid wider than the viewport
    // (grid items default to min-width:auto), overflowing the screen. truncate
    // keeps an over-long value inside its cell on the narrowest phones.
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {sub ? (
        <p className="mt-0.5 truncate text-[11px] tabular-nums text-fg-subtle">{sub}</p>
      ) : null}
    </div>
  );
}
