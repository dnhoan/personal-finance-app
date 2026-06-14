import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/locale";
import type { TxListItem } from "../queries";
import { TransactionRow } from "./transaction-row";

type DayGroup = { key: string; label: string; items: TxListItem[] };

// Buckets a newest-first list into per-ICT-day groups while preserving order.
// The input is already sorted DESC, so first-seen day order == display order.
function groupByDay(transactions: TxListItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const tx of transactions) {
    const label = formatDate(tx.occurredAt); // DD/MM/YYYY in ICT
    let group = byKey.get(label);
    if (!group) {
      group = { key: label, label, items: [] };
      byKey.set(label, group);
      groups.push(group);
    }
    group.items.push(tx);
  }
  return groups;
}

// Date-grouped history for the account detail page: a date header above each
// day's Card of rows. Reuses TransactionRow so row visuals never diverge.
export function GroupedTransactionList({
  transactions,
  accounts,
}: {
  transactions: TxListItem[];
  accounts: { id: string; name: string }[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Receipt size={32} className="text-fg-subtle" aria-hidden="true" />
        <p className="text-fg-muted">Chưa có giao dịch nào.</p>
        <p className="text-sm text-fg-subtle">Nhấn nút + để thêm giao dịch đầu tiên.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupByDay(transactions).map((group) => (
        <section key={group.key}>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            {group.label}
          </p>
          <Card className="px-4 py-0">
            <ul className="divide-y divide-border">
              {group.items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} accounts={accounts} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
