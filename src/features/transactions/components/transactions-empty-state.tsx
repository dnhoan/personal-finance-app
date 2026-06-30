import { Receipt } from "lucide-react";

// Shared calm empty state for the transactions list, account-detail history, and
// the load-more ledger so the three surfaces never diverge. The medallion gives
// the blank slate a little warmth without pulling focus from the + action.
export function TransactionsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted"
        aria-hidden="true"
      >
        <Receipt size={26} className="text-fg-subtle" />
      </span>
      <p className="font-medium text-fg">Chưa có giao dịch nào</p>
      <p className="max-w-[14rem] text-sm text-fg-subtle">
        Nhấn nút + để ghi khoản thu hoặc chi đầu tiên của bạn.
      </p>
    </div>
  );
}
