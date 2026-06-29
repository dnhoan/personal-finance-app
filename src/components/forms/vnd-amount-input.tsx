"use client";
import * as React from "react";
import { parseVnd, formatVnd } from "@/lib/vnd";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  /** Initial raw text (e.g. when editing an existing amount). */
  defaultRaw?: string;
  /** Called with the parsed whole-VND value, or null when empty/invalid. */
  onValueChange: (value: number | null) => void;
  "aria-label"?: string;
};

// Controlled VND entry. Accepts shorthand ("50k", "1,5tr", "1.500.000"), shows a
// live `→ 50.000 ₫` preview, and an inline hint when the input is ambiguous.
// inputmode="decimal" avoids the browser number-spinner formatting.
export function VndAmountInput({ id, defaultRaw = "", onValueChange, ...aria }: Props) {
  const [raw, setRaw] = React.useState(defaultRaw);
  const [touched, setTouched] = React.useState(false);

  const trimmed = raw.trim();
  const parsed = trimmed.length > 0 ? parseVnd(trimmed) : null;
  const showError = touched && trimmed.length > 0 && parsed === null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setRaw(next);
    const p = next.trim().length > 0 ? parseVnd(next.trim()) : null;
    onValueChange(p);
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="50k · 1tr · 1,5tr…"
        value={raw}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={id ? `${id}-hint` : undefined}
        className={cn(
          "text-lg font-semibold tabular-nums",
          showError && "border-expense focus-visible:ring-expense",
        )}
        {...aria}
      />
      <p
        id={id ? `${id}-hint` : undefined}
        className={cn("min-h-[1.125rem] text-sm", showError ? "text-expense" : "text-fg-muted")}
        aria-live="polite"
      >
        {showError
          ? 'Số tiền chưa rõ — thử "1,5tr" hoặc "1.500.000"'
          : parsed !== null
            ? `→ ${formatVnd(parsed)}`
            : " "}
      </p>
    </div>
  );
}
