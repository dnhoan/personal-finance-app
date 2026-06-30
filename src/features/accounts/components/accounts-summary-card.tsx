import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";

// Net-worth hero: the total across active balances, plus a composition bar that
// shows what that total is made of — assets (green) vs. liabilities (red). The
// bar only appears when there are liabilities to weigh against; otherwise the
// total is purely assets and a plain count line suffices.
export function AccountsSummaryCard({
  total,
  assetsTotal,
  liabilitiesTotal,
  assetCount,
  debtCount,
}: {
  total: number;
  /** Sum of asset balances (≥ 0 in practice). */
  assetsTotal: number;
  /** Sum of liability balances (negative); magnitude is what's owed. */
  liabilitiesTotal: number;
  assetCount: number;
  debtCount: number;
}) {
  const assetsMag = Math.max(0, assetsTotal);
  const liabMag = Math.abs(liabilitiesTotal);
  const span = assetsMag + liabMag;
  const showBar = liabMag > 0 && span > 0;
  const assetsPct = span > 0 ? (assetsMag / span) * 100 : 100;

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

      {showBar ? (
        <div className="mt-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full bg-income" style={{ width: `${assetsPct}%` }} />
            <div className="h-full flex-1 bg-expense" />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px] tabular-nums">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full bg-income" aria-hidden="true" />
              Tài sản {formatVnd(assetsMag)}
            </span>
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full bg-expense" aria-hidden="true" />
              Nợ {formatVnd(liabMag)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-fg-muted">
          {assetCount} tài khoản · {debtCount} khoản nợ
        </p>
      )}
    </Card>
  );
}
