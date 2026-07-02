"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Coins,
  Landmark,
  CreditCard,
  Smartphone,
  HandCoins,
  ArrowDownLeft,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { TxDetail } from "../queries";
import { deleteTransaction } from "../actions";
import { TransactionEditSheet } from "./transaction-edit-sheet";

// Account-type icon fallback (used when a tx has no category and isn't a transfer).
// Mirrors the map in transaction-row.tsx; kept local to avoid a premature shared
// module for two small maps.
const ACCOUNT_ICON: Record<TxDetail["accountType"], LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  debt: HandCoins,
  receivable: ArrowDownLeft,
};

const KIND_ICON_BG: Record<TxDetail["kind"], string> = {
  income: "bg-income-soft",
  expense: "bg-expense-soft",
  transfer: "bg-surface-muted",
};
const KIND_ICON_FG: Record<TxDetail["kind"], string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
};

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// Detail hero + back link + overflow menu. Mirrors AccountDetailHeader's layout,
// but the amount is the focal point (Fraunces, kind color + sign; transfers are
// neutral/sign-less). Edit/Delete reuse the existing sheet + server action.
export function TransactionDetailHeader({
  tx,
  accounts,
}: {
  tx: TxDetail;
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

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

  // Delete on the detail page routes back to the list — the row you'd undo into is
  // no longer on screen, so there's no undo toast here (undo stays on the list).
  function handleDelete() {
    startTransition(async () => {
      await deleteTransaction({ id: tx.id });
      router.push("/transactions");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/transactions"
          className="flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
        >
          <ChevronLeft size={18} aria-hidden="true" /> Giao dịch
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Tùy chọn giao dịch"
            className="flex h-9 w-9 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Transfers are view-only (consistent with the list, which hides Edit
                for transfers). */}
            {!isTransfer && (
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil size={16} aria-hidden="true" /> Sửa
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-expense"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            KIND_ICON_BG[tx.kind],
          )}
          style={tx.categoryColor ? { color: tx.categoryColor } : undefined}
          aria-hidden="true"
        >
          <Icon
            size={26}
            strokeWidth={1.75}
            className={cn(!tx.categoryColor && KIND_ICON_FG[tx.kind])}
          />
        </span>
        <p className="font-medium text-fg">{title}</p>
        <p
          className={cn("text-4xl font-semibold tabular-nums", amountClass)}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {amountText}
        </p>
      </section>

      {/* Recurring-rule instances open the plain edit sheet here (edits just this
          transaction). The this-instance-vs-series EditInstanceDialog lives only on
          the row menu — an intentional asymmetry between the list and the detail. */}
      {!isTransfer && (
        <TransactionEditSheet
          tx={{
            id: tx.id,
            kind: tx.kind as "income" | "expense",
            amount: Math.abs(tx.amount),
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            note: tx.note,
            occurredAt: tx.occurredAt,
          }}
          accounts={accounts}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={isTransfer ? "Xóa cặp giao dịch chuyển khoản" : "Xóa giao dịch"}
        description="Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
