import { Receipt } from "lucide-react";
import type { TxListItem } from "../queries";
import { TransactionRow } from "./transaction-row";

// Server-rendered transaction list with a calm empty state.
export function TransactionList({ transactions }: { transactions: TxListItem[] }) {
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
    <ul className="divide-y divide-border">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </ul>
  );
}
