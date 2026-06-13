"use client";
import * as React from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { deleteTransaction } from "../actions";

// Per-row overflow menu. Delete confirms first; for a transfer it removes both
// legs (the server action cascades the pair).
export function TransactionRowActions({ id, isTransfer }: { id: string; isTransfer: boolean }) {
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tùy chọn giao dịch"
        className="flex h-9 w-9 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={pending}
          className="text-expense"
          onSelect={(e) => {
            e.preventDefault();
            const ok = window.confirm(
              isTransfer ? "Xóa cả cặp giao dịch chuyển khoản?" : "Xóa giao dịch này?",
            );
            if (ok) startTransition(() => void deleteTransaction({ id }));
          }}
        >
          <Trash2 size={16} aria-hidden="true" /> Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
