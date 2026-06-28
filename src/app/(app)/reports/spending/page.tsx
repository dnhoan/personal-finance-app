import type { Route } from "next";
import { requireSession } from "@/lib/auth-session";
import { spendingByCategory } from "@/features/reports/spending-by-category-query";
import { getRange, parsePreset } from "@/features/reports/lib/range-presets";
import { BackLink } from "@/components/app-shell/back-link";
import { ReportTabs } from "@/features/reports/components/report-tabs";
import { RangePicker } from "@/features/reports/components/range-picker";
import { SpendingDonut } from "@/features/reports/components/spending-donut";
import { ChartDataTable } from "@/features/reports/components/chart-data-table";

export const metadata = { title: "Theo danh mục · Báo cáo" };

type SearchParams = Record<string, string | undefined>;

export default async function SpendingReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const preset = parsePreset(sp.range);
  const range = getRange(preset, new Date(), { from: sp.from, to: sp.to });
  const drillRootId = sp.drill ?? null;
  const breakdown = await spendingByCategory(user.id, range, drillRootId);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={"/dashboard" as Route} label="Báo cáo" />
      <ReportTabs active="spending" />
      <RangePicker />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Chi theo danh mục</h2>
          <span className="text-[11px] text-fg-subtle">Chỉ chi tiêu</span>
        </div>
        <SpendingDonut breakdown={breakdown} />
        <ChartDataTable
          caption="Chi tiêu theo danh mục"
          columns={[{ key: "total", label: "Số tiền" }]}
          rows={breakdown.slices.map((s) => ({ label: s.name, values: { total: s.total } }))}
        />
      </section>
    </div>
  );
}
