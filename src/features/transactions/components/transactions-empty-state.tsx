import { Receipt } from "lucide-react";

// Shared calm empty state for the transactions list, account-detail history, and
// the load-more ledger so the three surfaces never diverge.
export function TransactionsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Receipt size={32} className="text-fg-subtle" aria-hidden="true" />
      <p className="text-fg-muted">Chưa có giao dịch nào.</p>
      <p className="text-sm text-fg-subtle">Nhấn nút + để thêm giao dịch đầu tiên.</p>
    </div>
  );
}
