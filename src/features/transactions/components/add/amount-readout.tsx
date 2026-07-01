"use client";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { TxKind } from "../kind-toggle";

// Per-kind treatment for the hero readout: the panel tint, the amount color, and
// the sign glyph that fronts the number. Transfer is directionless, so no sign.
const KIND_STYLE: Record<TxKind, { panel: string; text: string; sign: string }> = {
  expense: { panel: "bg-expense-soft", text: "text-expense", sign: "−" },
  income: { panel: "bg-income-soft", text: "text-income", sign: "+" },
  transfer: { panel: "bg-surface-muted", text: "text-transfer", sign: "" },
};

// Big live-formatted amount the user confirms ("− 50.000 ₫"). Presentation only —
// the keypad drives `amount` (whole VND). Color follows the chosen kind so the
// panel reads as income/expense/transfer at a glance.
export function AmountReadout({ kind, amount }: { kind: TxKind; amount: number }) {
  const style = KIND_STYLE[kind];
  const hasValue = amount > 0;

  return (
    <div className={cn("rounded-lg px-4 py-6 transition-colors duration-200", style.panel)}>
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
          style={{ fontFamily: "var(--font-serif)" }}
          className={cn(
            "text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums",
            hasValue ? style.text : "text-fg-subtle",
          )}
        >
          {hasValue ? formatVnd(amount) : "0 ₫"}
        </span>
      </div>
    </div>
  );
}
