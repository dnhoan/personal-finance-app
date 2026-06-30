import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { TxSummary } from "../queries";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// One small labelled figure (caption + tabular amount) for the Thu/Chi pair.
// min-w-0 lets the cell shrink inside the grid track; nowrap keeps the sign glued
// to its amount instead of orphaning onto its own line on narrow screens.
function Cell({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span className={cn("truncate whitespace-nowrap text-sm font-semibold tabular-nums", color)}>
        {text}
      </span>
    </div>
  );
}

// Period summary band for the active filter range. "Còn lại" (net) is the figure
// people actually read, so it leads as the hero. On a phone the band stacks —
// net on top, Thu/Chi below — because VND figures run 8–9 digits and a horizontal
// 3-up layout squeezes them into wrapping. From `sm` up there's room, so it lays
// out side by side with the net pulled to the right past a divider.
// Server component — figures come from the DB aggregate (summariseTransactions),
// never derived from the visible/paginated rows, so they stay accurate.
export function TransactionSummary({ summary }: { summary: TxSummary }) {
  const net = summary.net;
  const netText = net === 0 ? formatVnd(0) : `${net > 0 ? "+" : MINUS} ${formatVnd(Math.abs(net))}`;
  const netColor = net > 0 ? "text-income" : net < 0 ? "text-expense" : "text-fg";

  return (
    <Card className="flex flex-col gap-3 border border-border p-4 sm:flex-row sm:items-stretch sm:gap-4">
      <div className="flex items-baseline justify-between gap-3 sm:order-3 sm:flex-col sm:items-end sm:justify-center sm:text-right">
        <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Còn lại
        </span>
        <span
          className={cn(
            "whitespace-nowrap text-2xl font-semibold leading-none tabular-nums sm:text-xl",
            netColor,
          )}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {netText}
        </span>
      </div>
      <div
        className="h-px w-full shrink-0 bg-border sm:order-2 sm:h-auto sm:w-px"
        aria-hidden="true"
      />
      <div className="grid grid-cols-2 gap-3 sm:order-1 sm:flex-1">
        <Cell label="Thu" text={`+ ${formatVnd(summary.income)}`} color="text-income" />
        <Cell label="Chi" text={`${MINUS} ${formatVnd(summary.expense)}`} color="text-expense" />
      </div>
    </Card>
  );
}
