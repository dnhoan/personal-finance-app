import {
  Coins,
  Landmark,
  CreditCard,
  Smartphone,
  HandCoins,
  ArrowLeftRight,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { formatDateTime } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { TxListItem } from "../queries";
import { TransactionRowActions } from "./transaction-row-actions";

const ACCOUNT_ICON: Record<TxListItem["accountType"], LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  debt: HandCoins,
};

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// 64px display row: tinted icon circle, title + meta stack, colored amount right.
// Amounts are stored signed for transfers; display uses the magnitude + a sign
// derived from kind (transfers are sign-less / neutral).
export function TransactionRow({ tx }: { tx: TxListItem }) {
  const isTransfer = tx.kind === "transfer";
  const Icon = isTransfer ? ArrowLeftRight : tx.categoryName ? Tag : ACCOUNT_ICON[tx.accountType];
  const abs = Math.abs(tx.amount);
  const amountText = isTransfer
    ? formatVnd(abs)
    : `${tx.kind === "expense" ? MINUS : "+"}${formatVnd(abs)}`;
  const amountClass =
    tx.kind === "income" ? "text-income" : tx.kind === "expense" ? "text-expense" : "text-transfer";
  const title =
    tx.categoryName ??
    (isTransfer ? "Chuyển khoản" : (tx.merchant ?? tx.note)) ??
    (tx.kind === "income" ? "Thu nhập" : "Chi tiêu");

  return (
    <li className="flex min-h-[64px] items-center gap-3 py-2">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted"
        style={tx.categoryColor ? { color: tx.categoryColor } : undefined}
        aria-hidden="true"
      >
        <Icon size={20} strokeWidth={1.75} className={cn(!tx.categoryColor && "text-fg-muted")} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg">{title}</p>
        <p className="truncate text-sm text-fg-muted">
          {tx.accountName} · {formatDateTime(tx.occurredAt)}
        </p>
      </div>

      <span className={cn("shrink-0 font-semibold tabular-nums", amountClass)}>{amountText}</span>
      <TransactionRowActions id={tx.id} isTransfer={isTransfer} />
    </li>
  );
}
