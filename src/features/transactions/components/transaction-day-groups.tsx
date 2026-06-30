import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { DayGroup } from "../lib/group-by-day";
import { TransactionRow } from "./transaction-row";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// Net subtotal for a day: sign + income/expense color, neutral when zero. Never
// color alone — the sign carries the same meaning for non-color vision.
function DaySubtotal({ subtotal }: { subtotal: number }) {
  const text =
    subtotal === 0
      ? formatVnd(0)
      : `${subtotal > 0 ? "+" : MINUS} ${formatVnd(Math.abs(subtotal))}`;
  const color = subtotal > 0 ? "text-income" : subtotal < 0 ? "text-expense" : "text-fg-muted";
  return <span className={cn("text-xs font-medium tabular-nums", color)}>{text}</span>;
}

// Presentational day-grouped ledger shared by the transactions page and the
// account detail page so row visuals never diverge. `card` wraps each day's rows
// in a Card (account detail); the main list stays card-less / full-bleed.
export function TransactionDayGroups({
  groups,
  accounts,
  card = false,
}: {
  groups: DayGroup[];
  accounts: { id: string; name: string }[];
  card?: boolean;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group) => {
        // The relative label ("Hôm nay" / "Hôm qua") leads in stronger ink; the
        // calendar date trails as a quiet timestamp. Older days have no relative
        // label, so the date alone leads.
        const hasRelative = group.label !== group.dateLabel;
        const rows = (
          <ul className="divide-y divide-border">
            {group.items.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} accounts={accounts} showDate={false} />
            ))}
          </ul>
        );
        // In the main (card-less) list the header pins to the top while its rows
        // scroll under it, so the day context never leaves the screen. Inside the
        // account-detail Card the header stays static — sticky would fight the
        // card's own clipping and rounded corners.
        const header = (
          <div
            className={cn(
              "flex items-baseline justify-between gap-3",
              card
                ? "mb-2 px-1"
                : "sticky top-0 z-10 -mx-4 mb-1 bg-background/85 px-4 py-2 backdrop-blur-sm",
            )}
          >
            <p className="flex items-baseline gap-1.5 truncate">
              {hasRelative && <span className="text-sm font-semibold text-fg">{group.label}</span>}
              <span
                className={cn(
                  "tabular-nums",
                  hasRelative ? "text-xs text-fg-subtle" : "text-sm font-semibold text-fg",
                )}
              >
                {group.dateLabel}
              </span>
            </p>
            <DaySubtotal subtotal={group.subtotal} />
          </div>
        );
        return (
          <section key={group.key}>
            {header}
            {card ? <Card className="px-4 py-0">{rows}</Card> : rows}
          </section>
        );
      })}
    </div>
  );
}
