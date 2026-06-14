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

  function go(delta: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("month", addMonths(monthKey, delta));
    router.replace(`${pathname}?${params.toString()}` as Route);
  }

  const navBtn =
    "flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Kỳ</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Tháng trước" className={navBtn} onClick={() => go(-1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold">
          <Calendar size={16} className="text-fg-muted" aria-hidden="true" />
          {formatMonthLabel(monthKey)}
        </span>
        <button type="button" aria-label="Tháng sau" className={navBtn} onClick={() => go(1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
