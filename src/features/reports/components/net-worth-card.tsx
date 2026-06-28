import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import type { NetWorthSnapshot } from "../queries";

const MINUS = "−";

// Dashboard net-worth summary: total + asset/liability split, links to the full
// /reports/net-worth breakdown. Total can be negative (debts exceed assets).
export function NetWorthCard({ snapshot }: { snapshot: NetWorthSnapshot }) {
  const negative = snapshot.net < 0;
  return (
    <Link
      href={"/reports/net-worth" as Route}
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-muted"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Giá trị ròng
        </p>
        <ChevronRight size={16} className="text-fg-subtle" aria-hidden="true" />
      </div>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${negative ? "text-expense" : "text-fg"}`}
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
    </Link>
  );
}
