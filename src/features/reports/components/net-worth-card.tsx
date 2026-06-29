import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { StatDelta } from "./stat-delta";
import type { NetWorthSnapshot } from "../queries";
import type { NetWorthTrendPoint } from "../net-worth-trend-query";

const MINUS = "−";

// Tiny inline net-worth sparkline. Pure SVG (no Recharts) so the card stays a
// server component; points are normalised into a fixed viewBox. Decorative —
// aria-hidden, with the StatDelta + sr-only report table carrying the meaning.
// Caller MUST pass >= 2 points (the `hasTrend` gate guarantees it) — the
// `points.length - 1` step divisor would otherwise be 0.
function Sparkline({ points }: { points: number[] }) {
  const w = 88;
  const h = 28;
  const pad = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Dashboard net-worth summary: total + asset/liability split, an optional mini
// trend sparkline + month-over-month delta, linking to the full report. Total can
// be negative (debts exceed assets).
export function NetWorthCard({
  snapshot,
  trend,
}: {
  snapshot: NetWorthSnapshot;
  trend?: NetWorthTrendPoint[];
}) {
  const negative = snapshot.net < 0;
  const hasTrend = trend != null && trend.length >= 2;
  // Delta `current` is the authoritative snapshot net (the headline number), not
  // the trend's last point. They are equal in the normal case (the current-month
  // trend point reproduces the snapshot — asserted by the equality-gate test); if
  // a future-dated transaction ever existed, the snapshot counts it but the
  // month-windowed trend would not, so anchoring to the snapshot keeps the
  // headline and its delta consistent.
  const current = snapshot.net;
  const previous = hasTrend ? trend[trend.length - 2]!.net : 0;

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
      {hasTrend && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <StatDelta current={current} previous={previous} label="so với tháng trước" />
          <Sparkline points={trend.map((p) => p.net)} />
        </div>
      )}
    </Link>
  );
}
