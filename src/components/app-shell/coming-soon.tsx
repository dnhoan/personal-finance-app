import type { LucideIcon } from "lucide-react";

// Calm placeholder for routes whose feature hasn't shipped yet. Mirrors the
// empty-state pattern in transaction-list.tsx (icon + muted copy, centered).
export function ComingSoon({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      {Icon ? <Icon size={32} className="text-fg-subtle" aria-hidden="true" /> : null}
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h1>
      {subtitle ? <p className="text-sm text-fg-subtle">{subtitle}</p> : null}
    </div>
  );
}
