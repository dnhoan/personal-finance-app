"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/features/categories/category-icons";
import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { PendingTxItem } from "../inbox-queries";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// Three one-tap suggestions cover most rows; anything else goes through the full
// picker. More than three and the row stops being scannable on a phone.
const QUICK_LIMIT = 3;

export function InboxRow({
  tx,
  suggestions,
  selecting,
  selected,
  busy,
  onToggleSelect,
  onQuickAssign,
  onOpenPicker,
  onDelete,
}: {
  tx: PendingTxItem;
  suggestions: CategoryPickerOption[];
  selecting: boolean;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onQuickAssign: (categoryId: string) => void;
  onOpenPicker: () => void;
  onDelete: () => void;
}) {
  const income = tx.kind === "income";
  const quick = suggestions.filter((c) => c.kind === tx.kind).slice(0, QUICK_LIMIT);

  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border p-3.5 last:border-b-0",
        busy && "opacity-50",
        selected && "bg-primary/5",
      )}
    >
      {selecting ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Chọn giao dịch ${formatVnd(Math.abs(tx.amount))}`}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn("font-semibold tabular-nums", income ? "text-income" : "text-expense")}
          >
            {income ? "+" : MINUS} {formatVnd(Math.abs(tx.amount))}
          </span>
          <span className="shrink-0 text-xs text-fg-subtle">{tx.gateway ?? tx.accountName}</span>
        </div>

        {tx.note ? (
          <p className="truncate text-[13px] text-fg-muted" title={tx.note}>
            {tx.note}
          </p>
        ) : null}

        {!selecting ? (
          <div className="flex flex-wrap gap-1.5">
            {quick.map((c) => {
              const Icon = getCategoryIcon(c.icon);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onQuickAssign(c.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <Icon size={13} style={c.color ? { color: c.color } : undefined} aria-hidden />
                  {c.name}
                </button>
              );
            })}
            <button
              type="button"
              disabled={busy}
              onClick={onOpenPicker}
              className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Khác…
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              aria-label="Xóa giao dịch"
              className="ml-auto inline-flex items-center rounded-full px-2 py-1 text-fg-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
