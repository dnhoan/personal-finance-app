import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import {
  spendingByCategory,
  spendingTotalForRange,
} from "@/features/reports/spending-by-category-query";
import {
  getRange,
  parsePreset,
  formatRangeLabel,
  previousRange,
} from "@/features/reports/lib/range-presets";
import { ReportPageHeader } from "@/features/reports/components/report-page-header";
import { RangePicker } from "@/features/reports/components/range-picker";
import { SpendingDonut } from "@/features/reports/components/spending-donut";
import { ChartDataTable } from "@/features/reports/components/chart-data-table";
import { EmptyState } from "@/features/reports/components/empty-state";
import { StatDelta } from "@/features/reports/components/stat-delta";

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
  // One `now` for both the current range and its preceding-period sibling so they
  // can't straddle a midnight boundary between two independent reads.
  const now = new Date();
  const range = getRange(preset, now, { from: sp.from, to: sp.to });
  const drillRootId = sp.drill ?? null;

  // Period total (whole range, regardless of drill) + the preceding equivalent
  // period for the MoM-style delta — both single SUMs, fanned out with the
  // breakdown so latency ≈ the slowest query.
  const [breakdown, totalSpend, prevTotalSpend] = await Promise.all([
    spendingByCategory(user.id, range, drillRootId),
    spendingTotalForRange(user.id, range),
    spendingTotalForRange(user.id, previousRange(preset, range, now)),
  ]);
  const hasSpend = breakdown.slices.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <ReportPageHeader title="Theo danh mục" active="spending" />
      <div className="flex flex-col gap-1">
        <RangePicker />
        <p className="px-1 text-[12px] text-fg-subtle">{formatRangeLabel(range)}</p>
      </div>

      {hasSpend && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            Tổng chi tiêu · toàn kỳ
          </p>
          <p
            className="mt-1 text-3xl font-semibold tabular-nums text-fg"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatVnd(totalSpend)}
          </p>
          <div className="mt-2">
            <StatDelta
              current={totalSpend}
              previous={prevTotalSpend}
              invert
              label="so với kỳ trước"
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Chi theo danh mục</h2>
          <span className="text-[11px] text-fg-subtle">Chỉ chi tiêu</span>
        </div>
        {!hasSpend ? (
          <EmptyState
            bare
            title="Chưa có chi tiêu"
            description="Chưa có khoản chi nào trong kỳ này."
            cta={{ href: "/transactions", label: "Thêm giao dịch" }}
          />
        ) : (
          <>
            <SpendingDonut breakdown={breakdown} />
            <ChartDataTable
              caption="Chi tiêu theo danh mục"
              columns={[{ key: "total", label: "Số tiền" }]}
              rows={breakdown.slices.map((s) => ({ label: s.name, values: { total: s.total } }))}
            />
          </>
        )}
      </section>
    </div>
  );
}
