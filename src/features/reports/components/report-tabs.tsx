import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

// Top-of-report segmented navigation between the three report surfaces. Server
// component — the active tab is passed in (each page knows its own identity).
export type ReportTab = "cash-flow" | "spending" | "net-worth";

// Routes cast to Route: typedRoutes only emits the literal types after a build,
// so until the first `next build` these new pages aren't yet in the union.
const TABS: { href: Route; label: string; key: ReportTab }[] = [
  { href: "/reports/cash-flow" as Route, label: "Dòng tiền", key: "cash-flow" },
  { href: "/reports/spending" as Route, label: "Theo danh mục", key: "spending" },
  { href: "/reports/net-worth" as Route, label: "Giá trị ròng", key: "net-worth" },
];

export function ReportTabs({ active }: { active: ReportTab }) {
  return (
    <div className="flex gap-1 rounded-full bg-surface-muted p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            // whitespace-nowrap keeps each label on one line — "Theo danh mục"
            // otherwise wraps inside its flex-1 third and inflates the row height.
            "flex-1 whitespace-nowrap rounded-full px-2 py-2 text-center text-[12px] font-semibold transition-colors",
            active === t.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
