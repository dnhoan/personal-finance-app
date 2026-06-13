"use client";
import * as React from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { deleteTransaction } from "../actions";
import type { TxListItem } from "../queries";
import { TransactionEditSheet } from "./transaction-edit-sheet";

// Per-row menu: Edit (income/expense only) + Delete. Delete confirms first; for
// a transfer it removes both legs (the server action cascades the pair).
export function TransactionRowActions({
  tx,
  accounts,
}: {
  tx: TxListItem;
  accounts: { id: string; name: string }[];
}) {
  const [pending, startTransition] = React.useTransition();
  const [editOpen, setEditOpen] = React.useState(false);
  const isTransfer = tx.kind === "transfer";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Tùy chọn giao dịch"
          className="flex h-9 w-9 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isTransfer && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil size={16} aria-hidden="true" /> Sửa
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={pending}
            className="text-expense"
            onSelect={(e) => {
              e.preventDefault();
              const ok = window.confirm(
                isTransfer ? "Xóa cả cặp giao dịch chuyển khoản?" : "Xóa giao dịch này?",
              );
              if (ok) startTransition(() => void deleteTransaction({ id: tx.id }));
            }}
          >
            <Trash2 size={16} aria-hidden="true" /> Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}
