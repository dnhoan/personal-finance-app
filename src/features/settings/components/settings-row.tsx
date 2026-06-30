import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Semantic icon-tile tints. Each maps to a theme token pair so both light and
// dark palettes resolve automatically — the row never hardcodes a color.
export const SETTINGS_TINTS = {
  navy: "bg-primary/10 text-primary",
  sage: "bg-accent/15 text-accent",
  amber: "bg-warning/15 text-warning",
  green: "bg-income-soft text-income",
} as const;

export type SettingsTint = keyof typeof SETTINGS_TINTS;

// A single settings navigation row: tinted icon tile + label + one-line
// description + chevron. Rendered inside a grouped section card. The tint and
// description give each row its own identity so the list scans by meaning, not
// just by reading every label.
export function SettingsRow({
  href,
  label,
  description,
  icon: Icon,
  tint = "navy",
}: {
  href: Route;
  label: string;
  description?: string;
  icon: LucideIcon;
  tint?: SettingsTint;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group flex min-h-[68px] touch-manipulation items-center gap-3.5 border-b border-border p-3.5 transition-[background-color,color] duration-100 [-webkit-tap-highlight-color:transparent] last:border-b-0 hover:bg-surface-muted active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
          SETTINGS_TINTS[tint],
        )}
      >
        <Icon size={20} strokeWidth={1.85} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-fg">{label}</span>
        {description ? (
          <span className="truncate text-[13px] text-fg-subtle">{description}</span>
        ) : null}
      </span>
      <ChevronRight
        size={18}
        className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
