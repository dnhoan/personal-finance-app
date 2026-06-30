import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";
import { ictGreeting, ictDateLabel } from "../lib/greeting";

// Dashboard header: today's date as an eyebrow over a time-aware Fraunces
// greeting, orienting the user in time the moment they land. The report link is
// promoted to a pill so it clears the 44px touch target. Server component — the
// greeting/date are computed from server ICT wall-clock at render.
export function DashboardHeader({ showReportLink }: { showReportLink: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          {ictDateLabel()}
        </p>
        <h1
          className="mt-0.5 truncate text-2xl font-semibold text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {ictGreeting()}
        </h1>
      </div>
      {showReportLink && (
        <Link
          href={"/reports/cash-flow" as Route}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          Báo cáo
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
