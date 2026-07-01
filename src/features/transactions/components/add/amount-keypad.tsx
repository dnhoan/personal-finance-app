"use client";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { reduceAmount, type KeyAction } from "../../lib/amount-keypad-reducer";
import { SUBMIT_LABEL } from "../../lib/quick-add-form";
import type { TxKind } from "../kind-toggle";

// On-screen numeric keypad — the only amount input on /add (no OS keyboard). Keys
// dispatch pure KeyActions against the current amount; a large Save key anchors the
// bottom-right. Preset add-chips sit above the grid for one-tap common amounts.

const PRESETS = [10_000, 50_000, 100_000] as const;

// Grid keys in visual order. `wide` marks the Save cell that spans two columns.
type KeyDef =
  | { kind: "action"; label: string; action: KeyAction; ariaLabel?: string }
  | { kind: "icon"; label: "backspace"; action: KeyAction; ariaLabel: string };

const KEYS: KeyDef[] = [
  { kind: "action", label: "7", action: { type: "digit", d: 7 } },
  { kind: "action", label: "8", action: { type: "digit", d: 8 } },
  { kind: "action", label: "9", action: { type: "digit", d: 9 } },
  {
    kind: "action",
    label: "×1k",
    action: { type: "mult", factor: 1_000 },
    ariaLabel: "Nhân một nghìn",
  },
  { kind: "action", label: "4", action: { type: "digit", d: 4 } },
  { kind: "action", label: "5", action: { type: "digit", d: 5 } },
  { kind: "action", label: "6", action: { type: "digit", d: 6 } },
  {
    kind: "action",
    label: "×1tr",
    action: { type: "mult", factor: 1_000_000 },
    ariaLabel: "Nhân một triệu",
  },
  { kind: "action", label: "1", action: { type: "digit", d: 1 } },
  { kind: "action", label: "2", action: { type: "digit", d: 2 } },
  { kind: "action", label: "3", action: { type: "digit", d: 3 } },
  { kind: "icon", label: "backspace", action: { type: "backspace" }, ariaLabel: "Xóa số" },
  { kind: "action", label: "000", action: { type: "zeros", n: 3 } },
  { kind: "action", label: "0", action: { type: "digit", d: 0 } },
];

const KEY_CLASS =
  "flex h-14 items-center justify-center rounded-md bg-surface-muted text-xl font-medium text-fg tabular-nums " +
  "touch-manipulation [-webkit-tap-highlight-color:transparent] " +
  "transition-transform duration-75 active:scale-95 active:bg-border motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function AmountKeypad({
  amount,
  kind,
  onAmountChange,
  onSave,
}: {
  amount: number;
  kind: TxKind;
  onAmountChange: (next: number) => void;
  onSave: () => void;
}) {
  const apply = (action: KeyAction) => onAmountChange(reduceAmount(amount, action));
  const canSave = amount > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {PRESETS.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => apply({ type: "add", delta })}
            className="flex-1 rounded-full border border-border py-2 text-sm font-medium text-fg-muted transition-transform duration-75 active:scale-95 active:text-fg motion-reduce:active:scale-100"
          >
            +{delta / 1_000}k
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => apply(key.action)}
            aria-label={key.ariaLabel}
            className={KEY_CLASS}
          >
            {key.kind === "icon" ? <Delete size={22} aria-hidden="true" /> : key.label}
          </button>
        ))}

        {/* Save spans the last two cells of the bottom row (right of 000 / 0). */}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={cn(
            "col-span-2 flex h-14 items-center justify-center rounded-md text-base font-semibold",
            "touch-manipulation [-webkit-tap-highlight-color:transparent]",
            "transition-transform duration-75 active:scale-95 motion-reduce:active:scale-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            canSave
              ? "bg-primary text-primary-foreground"
              : "cursor-not-allowed bg-primary/40 text-primary-foreground",
          )}
        >
          {SUBMIT_LABEL[kind]}
        </button>
      </div>
    </div>
  );
}
