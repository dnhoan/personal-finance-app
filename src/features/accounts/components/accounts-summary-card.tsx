import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";

// Total-balance hero card: the sum of all active balances plus a count line
// ("N tài khoản · M khoản nợ"). Asset count is non-debt accounts; debt count is
// liabilities. Both exclude archived accounts.
export function AccountsSummaryCard({
  total,
  assetCount,
  debtCount,
}: {
  total: number;
  assetCount: number;
  debtCount: number;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Tổng số dư</p>
      <p
        className={cn(
          "mt-1 text-4xl font-semibold tabular-nums",
          total < 0 ? "text-expense" : "text-fg",
        )}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {formatVnd(total)}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {assetCount} tài khoản · {debtCount} khoản nợ
      </p>
    </Card>
  );
}
