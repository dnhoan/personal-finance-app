"use client";
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";
import {
  Coins,
  Landmark,
  CreditCard,
  Smartphone,
  HandCoins,
  ArrowDownLeft,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatVnd } from "@/lib/vnd";
import { formatDateTime, formatTime } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { TxListItem } from "../queries";
import { deleteTransaction } from "../actions";
import { TransactionRowActions } from "./transaction-row-actions";

// How long the row stays hidden + the undo toast is offered before the delete
// actually commits server-side.
const UNDO_WINDOW_MS = 5000;

const ACCOUNT_ICON: Record<TxListItem["accountType"], LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  debt: HandCoins,
  receivable: ArrowDownLeft,
};

// Soft direction wash behind each row's icon. Income/expense rows pick up a gentle
// green/red tint so the list reads as a flow of money down the left edge before
// any number is parsed; transfers stay neutral. The glyph keeps the category color
// on top (set via inline `color`), so category identity survives the tint.
const KIND_ICON_BG: Record<TxListItem["kind"], string> = {
  income: "bg-income-soft",
  expense: "bg-expense-soft",
  transfer: "bg-surface-muted",
};
const KIND_ICON_FG: Record<TxListItem["kind"], string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
};

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// 64px display row: tinted icon circle, title + meta stack, colored amount right.
// Amounts are stored signed for transfers; display uses the magnitude + a sign
// derived from kind (transfers are sign-less / neutral). `accounts` feeds the
// row's edit sheet (income/expense rows only).
export function TransactionRow({
  tx,
  accounts,
  // Surfaces with a day header (the grouped ledger) pass `false` to show time
  // only — the date already lives in the header. Flat surfaces (dashboard) keep
  // the full date+time so the day isn't lost.
  showDate = true,
}: {
  tx: TxListItem;
  accounts: { id: string; name: string }[];
  showDate?: boolean;
}) {
  const [, startTransition] = React.useTransition();
  // Optimistic removal: the row hides the instant the user deletes and reappears
  // on Undo. The real server delete commits only after the undo window. The timer
  // lives here (not in the unmounted actions child) so this still-mounted row can
  // flush it on a genuine unmount (client nav) instead of dropping the delete.
  const [removed, setRemoved] = React.useState(false);
  const pendingDelete = React.useRef<{
    timer: ReturnType<typeof setTimeout>;
    run: () => void;
  } | null>(null);
  React.useEffect(
    () => () => {
      const p = pendingDelete.current;
      if (p) {
        clearTimeout(p.timer);
        p.run();
      }
    },
    [],
  );

  function handleDelete() {
    setRemoved(true);
    let undone = false;
    const commit = () => {
      pendingDelete.current = null;
      if (!undone) startTransition(() => void deleteTransaction({ id: tx.id }));
    };
    const timer = setTimeout(commit, UNDO_WINDOW_MS);
    pendingDelete.current = { timer, run: commit };

    toast(tx.kind === "transfer" ? "Đã xóa cặp giao dịch chuyển khoản" : "Đã xóa giao dịch", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Hoàn tác",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          pendingDelete.current = null;
          setRemoved(false); // bring the row back
        },
      },
    });
  }

  if (removed) return null;

  const isTransfer = tx.kind === "transfer";
  const Icon = isTransfer
    ? ArrowLeftRight
    : tx.categoryName
      ? getCategoryIcon(tx.categoryIcon)
      : ACCOUNT_ICON[tx.accountType];
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
    // content-visibility skips rendering off-screen rows so long month lists stay
    // smooth without a windowing dep. contain-intrinsic-size reserves the ~64px
    // row height so the scrollbar and scroll position stay stable while culled.
    <li className="flex min-h-[64px] items-center gap-3 py-2 [contain-intrinsic-size:auto_64px] [content-visibility:auto]">
      {/* Tapping the icon/title/amount cluster opens the detail; the actions menu
          is a sibling (not nested) so its trigger never activates this link. */}
      <Link
        href={`/transactions/${tx.id}` as Route}
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            KIND_ICON_BG[tx.kind],
          )}
          style={tx.categoryColor ? { color: tx.categoryColor } : undefined}
          aria-hidden="true"
        >
          <Icon
            size={20}
            strokeWidth={1.75}
            className={cn(!tx.categoryColor && KIND_ICON_FG[tx.kind])}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{title}</p>
          <p className="truncate text-sm text-fg-muted">
            {tx.accountName} ·{" "}
            {showDate ? formatDateTime(tx.occurredAt) : formatTime(tx.occurredAt)}
          </p>
        </div>

        <span className={cn("shrink-0 font-semibold tabular-nums", amountClass)}>{amountText}</span>
      </Link>
      <TransactionRowActions tx={tx} accounts={accounts} onDelete={handleDelete} />
    </li>
  );
}
