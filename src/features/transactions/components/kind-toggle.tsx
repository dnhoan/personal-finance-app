"use client";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TxKind = "income" | "expense" | "transfer";

const OPTIONS: { value: TxKind; label: string; icon: LucideIcon; activeText: string }[] = [
  { value: "expense", label: "Chi", icon: ArrowUpRight, activeText: "text-expense" },
  { value: "income", label: "Thu", icon: ArrowDownLeft, activeText: "text-income" },
  { value: "transfer", label: "Chuyển", icon: ArrowLeftRight, activeText: "text-fg" },
];

// 3-segment pill bound to a controlled value. Switching to "transfer" is what
// swaps the category field for the from/to account fields upstream.
export function KindToggle({
  value,
  onChange,
}: {
  value: TxKind;
  onChange: (kind: TxKind) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Loại giao dịch"
      className="grid grid-cols-3 gap-1 rounded-md bg-surface-muted p-1"
    >
      {OPTIONS.map(({ value: v, label, icon: Icon, activeText }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors",
              active ? cn("bg-surface shadow-sm", activeText) : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
