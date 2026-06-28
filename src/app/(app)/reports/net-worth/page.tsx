import type { Route } from "next";
import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { ACCOUNT_META } from "@/features/accounts/account-meta";
import { netWorthSnapshot } from "@/features/reports/queries";
import { BackLink } from "@/components/app-shell/back-link";
import { ReportTabs } from "@/features/reports/components/report-tabs";
import type { AccountWithBalance } from "@/features/accounts/queries";

export const metadata = { title: "Giá trị ròng · Báo cáo" };

const MINUS = "−";

export default async function NetWorthReportPage() {
  const { user } = await requireSession();
  const snapshot = await netWorthSnapshot(user.id);
  const { grouped } = snapshot;
  const negative = snapshot.net < 0;

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={"/dashboard" as Route} label="Báo cáo" />
      <ReportTabs active="net-worth" />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Tổng giá trị ròng
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
            Tài sản <span className="font-medium text-income">{formatVnd(snapshot.assets)}</span>
          </span>
          <span>
            Nợ{" "}
            <span className="font-medium text-expense">
              {formatVnd(Math.abs(snapshot.liabilities))}
            </span>
          </span>
        </div>
      </section>

      {grouped.assets.rows.length > 0 && (
        <AccountGroup title="Tài sản" rows={grouped.assets.rows} />
      )}
      {grouped.liabilities.rows.length > 0 && (
        <AccountGroup title="Nợ" rows={grouped.liabilities.rows} owed />
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
