"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, presetLabel, parsePreset, type RangePreset } from "../lib/range-presets";

// Segmented preset selector for /reports/*, persisting choice in the ?range=
// search param so server components re-query and the selection is shareable /
// back-button-safe. "Custom" reveals two native date inputs writing ?from/?to.
export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = parsePreset(params.get("range") ?? undefined);

  const update = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mut(next);
    // Drilling is per-range; reset it when the range changes.
    next.delete("drill");
    router.push(`${pathname}?${next.toString()}` as Route);
  };

  const selectPreset = (preset: RangePreset) =>
    update((p) => {
      p.set("range", preset);
      if (preset !== "custom") {
        p.delete("from");
        p.delete("to");
      }
    });

  const setBound = (key: "from" | "to", value: string) =>
    update((p) => {
      p.set("range", "custom");
      if (value) p.set(key, value);
      else p.delete(key);
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => selectPreset(preset)}
            aria-pressed={active === preset}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active === preset ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {presetLabel(preset)}
          </button>
        ))}
      </div>

      {active === "custom" && (
        <div className="flex items-center gap-2 text-[13px]">
          <CalendarRange size={16} className="shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            type="date"
            aria-label="Từ ngày"
            defaultValue={params.get("from") ?? ""}
            onChange={(e) => setBound("from", e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1 tabular-nums"
          />
          <span className="text-fg-subtle">→</span>
          <input
            type="date"
            aria-label="Đến ngày"
            defaultValue={params.get("to") ?? ""}
            onChange={(e) => setBound("to", e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1 tabular-nums"
          />
        </div>
      )}
    </div>
  );
}
