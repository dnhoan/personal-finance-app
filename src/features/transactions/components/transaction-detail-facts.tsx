import {
  ArrowLeftRight,
  Repeat,
  Target,
  Coins,
  Landmark,
  CreditCard,
  Smartphone,
  HandCoins,
  ArrowDownLeft,
  type LucideIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/locale";
import { Card } from "@/components/ui/card";
import type { TxDetail } from "../queries";

const ACCOUNT_ICON: Record<TxDetail["accountType"], LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  debt: HandCoins,
  receivable: ArrowDownLeft,
};

const KIND_LABEL: Record<TxDetail["kind"], string> = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  transfer: "Chuyển khoản",
};

// One label→value row of the facts list. Value can be text or an icon+text node.
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-fg-subtle">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-fg">{children}</span>
    </div>
  );
}

// Read-only definition list of a transaction's essentials + an optional goal chip.
// Transfers show a "from → to" row (both accounts) and suppress the single-account
// row; income/expense show their single account. No audit timestamps (essentials
// only, per plan).
export function TransactionDetailFacts({ tx }: { tx: TxDetail }) {
  const isTransfer = tx.kind === "transfer";
  const AccountIcon = ACCOUNT_ICON[tx.accountType];

  return (
    <Card className="divide-y divide-border border border-border">
      {isTransfer && tx.transfer ? (
        <Fact label="Chuyển khoản">
          <span className="inline-flex items-center gap-1.5">
            {tx.transfer.fromAccountName}
            <ArrowLeftRight size={14} className="text-fg-subtle" aria-hidden="true" />
            {tx.transfer.toAccountName}
          </span>
        </Fact>
      ) : (
        <Fact label="Tài khoản">
          <span className="inline-flex items-center gap-1.5">
            <AccountIcon size={14} className="text-fg-subtle" aria-hidden="true" />
            {tx.accountName}
          </span>
        </Fact>
      )}

      {tx.categoryName && <Fact label="Danh mục">{tx.categoryName}</Fact>}

      <Fact label="Thời gian">{formatDateTime(tx.occurredAt)}</Fact>

      {tx.note && <Fact label="Ghi chú">{tx.note}</Fact>}

      {tx.merchant && <Fact label="Cửa hàng">{tx.merchant}</Fact>}

      <Fact label="Loại">{KIND_LABEL[tx.kind]}</Fact>

      {tx.recurringRuleId && (
        <Fact label="Định kỳ">
          <span className="inline-flex items-center gap-1.5">
            <Repeat size={14} className="text-fg-subtle" aria-hidden="true" />
            Giao dịch định kỳ
          </span>
        </Fact>
      )}

      {tx.goalName && (
        <Fact label="Mục tiêu">
          <span className="inline-flex items-center gap-1.5">
            <Target size={14} className="text-fg-subtle" aria-hidden="true" />
            {tx.goalName}
          </span>
        </Fact>
      )}
    </Card>
  );
}
