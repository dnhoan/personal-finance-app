"use client";
import * as React from "react";
import { parseVnd, formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { TxKind } from "./kind-toggle";

// Per-kind treatment for the hero readout: the panel tint, the amount color, and
// the sign glyph that fronts the number. Transfer is directionless, so no sign.
const KIND_STYLE: Record<TxKind, { panel: string; text: string; sign: string }> = {
  expense: { panel: "bg-expense-soft", text: "text-expense", sign: "−" },
  income: { panel: "bg-income-soft", text: "text-income", sign: "+" },
  transfer: { panel: "bg-surface-muted", text: "text-transfer", sign: "" },
};

// Hero amount entry for the quick-add sheet. The big live-formatted readout is the
// thing the user confirms ("− 50.000 ₫"); the input below is the control strip
// where shorthand ("50k", "1,5tr") is typed. Color follows the chosen kind so the
// whole panel reads as income/expense/transfer at a glance. Local-only state — the
// sheet unmounts on close, so each open starts clean, matching the form reset.
export function QuickAddAmountField({
  id,
  kind,
  onValueChange,
}: {
  id: string;
  kind: TxKind;
  onValueChange: (value: number | null) => void;
}) {
  const [raw, setRaw] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const trimmed = raw.trim();
  const parsed = trimmed.length > 0 ? parseVnd(trimmed) : null;
  const ambiguous = touched && trimmed.length > 0 && parsed === null;
  const style = KIND_STYLE[kind];
  const hasValue = parsed !== null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setRaw(next);
    const t = next.trim();
    onValueChange(t.length > 0 ? parseVnd(t) : null);
  }

  return (
    <div className={cn("rounded-lg px-4 pb-3 pt-4 transition-colors duration-200", style.panel)}>
      <div className="flex items-baseline justify-center gap-1.5">
        {style.sign && (
          <span
            aria-hidden="true"
            className={cn(
              "text-3xl font-semibold leading-none tabular-nums",
              hasValue ? style.text : "text-fg-subtle",
            )}
          >
            {style.sign}
          </span>
        )}
        <span
          aria-hidden="true"
          style={{ fontFamily: "var(--font-serif)" }}
          className={cn(
            "text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums",
            hasValue ? style.text : "text-fg-subtle",
          )}
        >
          {hasValue ? formatVnd(parsed) : "0 ₫"}
        </span>
      </div>

      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="Nhập số tiền — 50k · 1tr · 1,5tr"
        value={raw}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        aria-label="Số tiền"
        aria-invalid={ambiguous}
        aria-describedby={`${id}-hint`}
        className={cn(
          "mt-3 h-11 w-full rounded-md border bg-surface/70 px-3 text-center text-base tabular-nums text-fg",
          "placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          ambiguous ? "border-expense" : "border-border",
        )}
      />
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={cn(
          "mt-1.5 min-h-[1.125rem] text-center text-sm",
          ambiguous ? "text-expense" : "text-fg-muted",
        )}
      >
        {ambiguous ? 'Số tiền chưa rõ — thử "1,5tr" hoặc "1.500.000"' : " "}
      </p>
    </div>
  );
}
