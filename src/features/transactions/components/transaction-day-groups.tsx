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
        // "Hôm nay · 23/05/2026"; older days collapse to just the date.
        const heading =
          group.label === group.dateLabel ? group.dateLabel : `${group.label} · ${group.dateLabel}`;
        const rows = (
          <ul className="divide-y divide-border">
            {group.items.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} accounts={accounts} showDate={false} />
            ))}
          </ul>
        );
        return (
          <section key={group.key}>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                {heading}
              </p>
              <DaySubtotal subtotal={group.subtotal} />
            </div>
            {card ? <Card className="px-4 py-0">{rows}</Card> : rows}
          </section>
        );
      })}
    </div>
  );
}
