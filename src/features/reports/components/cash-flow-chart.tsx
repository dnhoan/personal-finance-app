"use client";
import {
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatVnd } from "@/lib/vnd";
import { CHART_COLORS, compactVnd, reducedMotion } from "./chart-theme";
import type { CashFlowBucket } from "../queries";
import type { Granularity } from "../lib/range-presets";

// Income/expense areas + net line over time, with an optional dashed reference
// line at the average net so a bucket reads against its own trend. Colors come
// from CSS vars so dark mode flips them automatically. Labels formatted per
// granularity.
export function CashFlowChart({
  data,
  granularity,
  avgNet,
}: {
  data: CashFlowBucket[];
  granularity: Granularity;
  /** Average net per bucket; rendered as a dashed reference line when provided. */
  avgNet?: number;
}) {
  const animationDuration = reducedMotion() ? 0 : 400;

  const label = (bucket: string) => {
    const [, m, d] = bucket.split("-");
    return granularity === "monthly" ? `T${Number(m)}` : `${d}/${m}`;
  };

  // Explicit Y domain spanning every series (income/expense areas baseline at 0,
  // plus the net line which can go negative). Recharts' auto domain can settle on
  // a floor of 0 and let a negative net line overflow below the plot rectangle;
  // padding both ends by 10% keeps strokes inside the rounded card. Always include
  // 0 so the area baselines sit on a real gridline, and the avg line if present.
  const values = data.flatMap((b) => [b.income, b.expense, b.net, 0]);
  if (avgNet !== undefined) values.push(avgNet);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = Math.max((dataMax - dataMin) * 0.1, 1);
  const yDomain: [number, number] = [dataMin - pad, dataMax + pad];

  return (
    // Wrap in a definite-width block: inside a flex-column parent a bare
    // ResponsiveContainer can resolve `width="100%"` to 0 (no definite inline
    // size to resolve against), painting the SVG scrambled/overlapping on first
    // render. The full-width wrapper gives the percentage a stable basis.
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cf-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={label}
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
            formatter={(value, name) => [
              formatVnd(Number(value)),
              name === "income" ? "Thu nhập" : name === "expense" ? "Chi tiêu" : "Thuần",
            ]}
            labelFormatter={(bucket) => label(String(bucket))}
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
            dataKey="income"
            stroke={CHART_COLORS.income}
            strokeWidth={2}
            fill="url(#cf-income)"
            animationDuration={animationDuration}
          />
          <Area
            type="linear"
            dataKey="expense"
            stroke={CHART_COLORS.expense}
            strokeWidth={2}
            fill="url(#cf-expense)"
            animationDuration={animationDuration}
          />
          {avgNet !== undefined && (
            <ReferenceLine
              y={avgNet}
              stroke={CHART_COLORS.axis}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}
          <Line
            type="linear"
            dataKey="net"
            stroke={CHART_COLORS.net}
            strokeWidth={2.5}
            dot={data.length <= 2}
            animationDuration={animationDuration}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
