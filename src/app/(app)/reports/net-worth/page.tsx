import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { formatMonthLabel } from "@/lib/month";
import { ACCOUNT_META } from "@/features/accounts/account-meta";
import { netWorthSnapshot } from "@/features/reports/queries";
import { netWorthTrend } from "@/features/reports/net-worth-trend-query";
import { ReportPageHeader } from "@/features/reports/components/report-page-header";
import { EmptyState } from "@/features/reports/components/empty-state";
import { NetWorthTrendChart } from "@/features/reports/components/net-worth-trend-chart";
import { ChartDataTable } from "@/features/reports/components/chart-data-table";
import type { AccountWithBalance } from "@/features/accounts/queries";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Giá trị ròng · Báo cáo" };

const MINUS = "−";

// Today as seen in Asia/Ho_Chi_Minh, formatted "d/M/yyyy" for the as-of line.
function todayLabelIct(now: Date = new Date()): string {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number) as [number, number, number];
  return `${d}/${m}/${y}`;
}

export default async function NetWorthReportPage() {
  const { user } = await requireSession();
  const [snapshot, trend] = await Promise.all([
    netWorthSnapshot(user.id),
    netWorthTrend(user.id, 12),
  ]);
  const { grouped } = snapshot;
  const negative = snapshot.net < 0;
  const hasAccounts = grouped.assets.rows.length > 0 || grouped.liabilities.rows.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className={ENTER}>
        <ReportPageHeader title="Giá trị ròng" active="net-worth" />
      </div>

      {!hasAccounts ? (
        <div className={ENTER} style={enterDelay(60)}>
          <EmptyState
            title="Chưa có tài khoản"
            description="Thêm tài khoản đầu tiên để theo dõi giá trị ròng của bạn."
            cta={{ href: "/accounts", label: "Thêm tài khoản" }}
          />
        </div>
      ) : (
        <>
          <section
            className={`rounded-2xl border border-border bg-surface p-5 ${ENTER}`}
            style={enterDelay(60)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              Tổng giá trị ròng · Tính đến {todayLabelIct()}
            </p>
            <p
              className={`mt-1 text-3xl font-semibold tabular-nums ${negative ? "text-expense" : "text-fg"}`}
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {negative ? MINUS : ""}
              {formatVnd(Math.abs(snapshot.net))}
            </p>
            <div className="mt-2 flex items-center gap-4 text-[12px] tabular-nums text-fg-muted">
              <span>
                Tài sản{" "}
                <span className="font-medium text-income">{formatVnd(snapshot.assets)}</span>
              </span>
              <span>
                Nợ{" "}
                <span className="font-medium text-expense">
                  {formatVnd(Math.abs(snapshot.liabilities))}
                </span>
              </span>
            </div>
          </section>

          {trend.length >= 2 && (
            <section
              className={`rounded-2xl border border-border bg-surface p-5 ${ENTER}`}
              style={enterDelay(120)}
            >
              <h2 className="mb-3 text-lg font-semibold text-fg">Diễn biến 12 tháng</h2>
              <NetWorthTrendChart data={trend} />
              <ChartDataTable
                caption="Giá trị ròng theo tháng"
                columns={[
                  { key: "net", label: "Thuần" },
                  { key: "assets", label: "Tài sản" },
                  { key: "liabilities", label: "Nợ" },
                ]}
                rows={trend.map((p) => ({
                  label: formatMonthLabel(p.monthKey),
                  values: { net: p.net, assets: p.assets, liabilities: p.liabilities },
                }))}
              />
            </section>
          )}

          {grouped.assets.rows.length > 0 && (
            <div className={ENTER} style={enterDelay(180)}>
              <AccountGroup title="Tài sản" rows={grouped.assets.rows} />
            </div>
          )}
          {grouped.liabilities.rows.length > 0 && (
            <div className={ENTER} style={enterDelay(240)}>
              <AccountGroup title="Nợ" rows={grouped.liabilities.rows} owed />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// One titled group of account rows. For debt accounts the balance is the amount
// still owed, so it's shown in the expense tone with a leading minus.
function AccountGroup({
  title,
  rows,
  owed = false,
}: {
  title: string;
  rows: AccountWithBalance[];
  owed?: boolean;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 text-sm font-semibold text-fg-muted">{title}</h2>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{a.name}</span>
            <span className="shrink-0 text-[11px] text-fg-subtle">
              {ACCOUNT_META[a.type].label}
            </span>
            <span
              className={`shrink-0 text-[14px] font-semibold tabular-nums ${owed ? "text-expense" : "text-fg"}`}
            >
              {owed ? MINUS : ""}
              {formatVnd(Math.abs(a.balance))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
