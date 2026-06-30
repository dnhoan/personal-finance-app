"use client";
import { cn } from "@/lib/utils";

type SegmentedOption = { value: string; label: string };

// One-of-many selector rendered as a single pill track with a floating active
// "thumb". Used for the transaction-kind filter, where the options are mutually
// exclusive and finite — a segmented control reads as "pick one of these" far
// better than separate chips, and visually separates the kind dimension from the
// scrollable date-range row above it. radiogroup/radio semantics expose that
// single-choice nature to assistive tech.
export function FilterSegmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-full border border-border bg-surface-muted p-1 sm:w-auto"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-[40px] flex-1 rounded-full px-3 text-sm font-medium transition-colors sm:flex-initial sm:px-5",
              "touch-manipulation [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted",
              active ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
