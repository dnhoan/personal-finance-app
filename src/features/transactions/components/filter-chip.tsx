"use client";
import { cn } from "@/lib/utils";

// Pill chip shared by the range + kind filter rows so the two never style-drift.
// URL-param driven by the caller's onClick. ≥44px touch target, aria-pressed, and
// a visible focus ring for keyboard + assistive tech.
export function FilterChip({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-fg-muted hover:border-fg-subtle",
      )}
    >
      {children}
    </button>
  );
}
