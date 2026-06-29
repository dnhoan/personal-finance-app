"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatVnd } from "@/lib/vnd";
import { CHART_COLORS, compactVnd, reducedMotion } from "./chart-theme";
import type { NetWorthTrendPoint } from "../net-worth-trend-query";

// Net-worth area trend over months. Mirrors cash-flow-chart conventions: colors
// from CSS vars (dark-mode-aware), reduced-motion guard, an explicit negative-aware
// padded y-domain (net worth can be below zero), and a definite-width wrapper so
// the ResponsiveContainer has a stable basis to resolve "100%" against.
export function NetWorthTrendChart({ data }: { data: NetWorthTrendPoint[] }) {
  const animationDuration = reducedMotion() ? 0 : 400;

  const axisLabel = (key: string) => `T${Number(key.split("-")[1])}`;
  const fullLabel = (key: string) => {
    const [y, m] = key.split("-");
    return `Tháng ${Number(m)}/${y}`;
  };

  const values = data.flatMap((p) => [p.net, 0]);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = Math.max((dataMax - dataMin) * 0.1, 1);
  const yDomain: [number, number] = [dataMin - pad, dataMax + pad];

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="nw-net" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.net} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.net} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="monthKey"
            tickFormatter={axisLabel}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={compactVnd}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [formatVnd(Number(value)), "Giá trị ròng"]}
            labelFormatter={(key) => fullLabel(String(key))}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              color: "var(--color-fg)",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <Area
            type="linear"
            dataKey="net"
            stroke={CHART_COLORS.net}
            strokeWidth={2.5}
            fill="url(#nw-net)"
            dot={data.length <= 2}
            animationDuration={animationDuration}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
