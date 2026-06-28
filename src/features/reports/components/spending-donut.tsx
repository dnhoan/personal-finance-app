"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatVnd } from "@/lib/vnd";
import { reducedMotion } from "./chart-theme";
import type { SpendingBreakdown, SpendingSlice } from "../spending-by-category-query";

// Fallback palette for slices whose category has no stored color, cycled by index.
const FALLBACK = ["#4338CA", "#B4423A", "#C2185B", "#B57B14", "#0E7490", "#6D28D9", "#2F855A"];
const sliceColor = (s: SpendingSlice, i: number) => s.color ?? FALLBACK[i % FALLBACK.length];

// Donut breakdown of spending. Clicking a top-level slice drills to that root's
// children via the ?drill= search param (shareable, back-button-safe). The server
// re-queries on navigation; the parent slice ids are the root category ids.
export function SpendingDonut({ breakdown }: { breakdown: SpendingBreakdown }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const animationDuration = reducedMotion() ? 0 : 400;
  const drilled = breakdown.drillRootId !== null;

  const setDrill = (rootId: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (rootId) next.set("drill", rootId);
    else next.delete("drill");
    router.push(`${pathname}?${next.toString()}` as Route);
  };

  // Top level: clicking a real category drills in. The synthetic "Khác" bucket
  // and any drilled view are not clickable.
  const onSliceClick = (slice: SpendingSlice) => {
    if (drilled || slice.categoryId === "__other__") return;
    setDrill(slice.categoryId);
  };

  if (breakdown.slices.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-fg-muted">Chưa có chi tiêu trong kỳ này.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[160px] w-[160px] shrink-0 self-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown.slices}
              dataKey="total"
              nameKey="name"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={1}
              stroke="var(--color-surface)"
              strokeWidth={2}
              animationDuration={animationDuration}
              onClick={(_, index) => onSliceClick(breakdown.slices[index]!)}
            >
              {breakdown.slices.map((s, i) => (
                <Cell
                  key={s.categoryId}
                  fill={sliceColor(s, i)}
                  cursor={!drilled && s.categoryId !== "__other__" ? "pointer" : "default"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatVnd(Number(value)), name]}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                color: "var(--color-fg)",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[15px] font-semibold tabular-nums text-fg"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatVnd(breakdown.total)}
          </span>
          <span className="text-[10px] text-fg-subtle">tổng</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {drilled && (
          <button
            type="button"
            onClick={() => setDrill(null)}
            className="mb-2 text-[12px] font-medium text-primary"
          >
            ← {breakdown.drillRootName ?? "Tất cả"}
          </button>
        )}
        <ul className="space-y-1.5">
          {breakdown.slices.map((s, i) => {
            const pct = breakdown.total > 0 ? Math.round((s.total / breakdown.total) * 100) : 0;
            const clickable = !drilled && s.categoryId !== "__other__";
            return (
              <li key={s.categoryId}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSliceClick(s)}
                  className="flex w-full items-center justify-between gap-2 text-left text-[13px] disabled:cursor-default"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: sliceColor(s, i) }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-fg">{s.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-fg-muted">{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
