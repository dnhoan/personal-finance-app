import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, type LucideIcon } from "lucide-react";

// A single settings navigation row: icon circle + label + chevron. Rendered
// inside a grouped section card. Focus/hover states match the app's other
// interactive rows.
export function SettingsRow({
  href,
  label,
  icon: Icon,
}: {
  href: Route;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex min-h-[64px] touch-manipulation items-center gap-3 border-b border-border p-4 transition-colors [-webkit-tap-highlight-color:transparent] last:border-b-0 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 font-medium text-fg">{label}</span>
      <ChevronRight size={20} className="shrink-0 text-fg-subtle" aria-hidden="true" />
    </Link>
  );
}
