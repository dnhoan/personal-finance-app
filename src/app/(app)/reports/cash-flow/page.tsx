import type { Route } from "next";
import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { cashFlowSeries } from "@/features/reports/queries";
import { getRange, parsePreset, defaultGranularity } from "@/features/reports/lib/range-presets";
import { BackLink } from "@/components/app-shell/back-link";
import { ReportTabs } from "@/features/reports/components/report-tabs";
import { RangePicker } from "@/features/reports/components/range-picker";
import { CashFlowChart } from "@/features/reports/components/cash-flow-chart";
import { ChartDataTable } from "@/features/reports/components/chart-data-table";

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

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={"/dashboard" as Route} label="Báo cáo" />
      <ReportTabs active="cash-flow" />
      <RangePicker />

      <section className="grid grid-cols-3 gap-2">
        <Kpi label="Vào" value={formatVnd(totalIncome)} tone="income" />
        <Kpi label="Ra" value={formatVnd(totalExpense)} tone="expense" />
        <Kpi label="Thuần" value={formatVnd(net)} tone={net >= 0 ? "income" : "expense"} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Dòng tiền</h2>
          <span className="text-[11px] text-fg-subtle">Không gồm chuyển khoản</span>
        </div>
        {series.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-fg-muted">
            Chưa có dữ liệu trong kỳ này.
          </p>
        ) : (
          <CashFlowChart data={series} granularity={granularity} />
        )}
        <ChartDataTable
          caption="Dòng tiền theo kỳ"
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

function Kpi({ label, value, tone }: { label: string; value: string; tone: "income" | "expense" }) {
  // Static class strings — Tailwind's JIT can't see runtime-built `text-${tone}`.
  const toneClass = tone === "income" ? "text-income" : "text-expense";
  return (
    // min-w-0 lets the grid cell shrink below its content's intrinsic width;
    // without it the long VND value forces the grid wider than the viewport
    // (grid items default to min-width:auto), overflowing the screen. truncate
    // keeps an over-long value inside its cell on the narrowest phones.
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className={`mt-1 truncate text-[13px] font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
