"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { addMonths, formatMonthLabel } from "@/lib/month";

// Prev/next month switcher; persists the selection in ?month=YYYY-MM so the
// server page re-renders for that period.
export function MonthNavigator({ monthKey }: { monthKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setMonth(next: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("month", next);
    router.replace(`${pathname}?${params.toString()}` as Route);
  }

  function go(delta: number) {
    setMonth(addMonths(monthKey, delta));
  }

  const navBtn =
    "flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-surface-muted text-fg-muted transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-border hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Tháng trước" className={navBtn} onClick={() => go(-1)}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <label className="relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
        <Calendar size={16} className="text-fg-muted" aria-hidden="true" />
        {formatMonthLabel(monthKey)}
        {/* Native month picker overlaid on the pill so tapping the label jumps
            directly to a month. value is "YYYY-MM", matching the month key. */}
        <input
          type="month"
          aria-label="Chọn tháng"
          value={monthKey}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
          onClick={(e) => {
            // The input is transparent, so its calendar indicator isn't visible;
            // open the picker explicitly when the pill is tapped/clicked.
            e.currentTarget.showPicker?.();
          }}
          className="absolute inset-0 cursor-pointer opacity-0 [-webkit-tap-highlight-color:transparent]"
        />
      </label>
      <button type="button" aria-label="Tháng sau" className={navBtn} onClick={() => go(1)}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
