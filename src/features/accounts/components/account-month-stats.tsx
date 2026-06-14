import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import type { AccountMonthStats } from "../queries";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// Current ICT month number (1–12) for the "T{n}" stat labels.
function currentIctMonth(): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "numeric",
  }).format(new Date());
  return Number(month);
}

// 2-column money-in/out card for the current ICT month: income (green) on the
// left, expense (red) on the right. Transfers are excluded upstream.
export function AccountMonthStats({ stats }: { stats: AccountMonthStats }) {
  const monthLabel = `T${currentIctMonth()}`;

  return (
    <Card className="grid grid-cols-2 gap-3 p-4">
      <div className="border-r border-border py-2 text-center">
        <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Vào · {monthLabel}</p>
        <p className="mt-1 text-base font-semibold tabular-nums text-income">
          + {formatVnd(stats.moneyIn)}
        </p>
      </div>
      <div className="py-2 text-center">
        <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Ra · {monthLabel}</p>
        <p className="mt-1 text-base font-semibold tabular-nums text-expense">
          {MINUS} {formatVnd(stats.moneyOut)}
        </p>
      </div>
    </Card>
  );
}
