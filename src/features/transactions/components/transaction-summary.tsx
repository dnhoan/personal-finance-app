import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { TxSummary } from "../queries";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// One labelled figure cell (caption + tabular amount).
function Cell({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", color)}>{text}</span>
    </div>
  );
}

// Period summary band: income / expense / net for the active filter range.
// Server component — figures come from the DB aggregate (summariseTransactions),
// never derived from the visible/paginated rows, so they stay accurate.
export function TransactionSummary({ summary }: { summary: TxSummary }) {
  const net = summary.net;
  const netText = net === 0 ? formatVnd(0) : `${net > 0 ? "+" : MINUS} ${formatVnd(Math.abs(net))}`;
  const netColor = net > 0 ? "text-income" : net < 0 ? "text-expense" : "text-fg-muted";

  return (
    <Card className="grid grid-cols-3 gap-3 p-4">
      <Cell label="Thu" text={`+ ${formatVnd(summary.income)}`} color="text-income" />
      <Cell label="Chi" text={`${MINUS} ${formatVnd(summary.expense)}`} color="text-expense" />
      <Cell label="Còn lại" text={netText} color={netColor} />
    </Card>
  );
}
