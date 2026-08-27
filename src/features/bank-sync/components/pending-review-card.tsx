import Link from "next/link";
import type { Route } from "next";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";

/**
 * Dashboard prompt for unreviewed bank transactions.
 *
 * Doubles as the explanation for a discrepancy the user would otherwise have to
 * puzzle out: while rows sit pending, the cash-flow figures above this card
 * include them but the spending reports do not, so the two totals will not tie.
 */
export function PendingReviewCard({ count, total }: { count: number; total: number }) {
  if (count === 0) return null;

  return (
    <Link href={"/inbox" as Route} className="block focus-visible:outline-none">
      <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Inbox size={19} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-fg">
            {count} giao dịch chờ phân loại · {formatVnd(total)}
          </span>
          <span className="text-[13px] text-fg-subtle">
            Đã tính vào số dư, chưa vào báo cáo chi tiêu
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-fg-subtle">
          →
        </span>
      </Card>
    </Link>
  );
}
