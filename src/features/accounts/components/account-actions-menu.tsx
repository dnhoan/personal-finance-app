"use client";
import * as React from "react";
import { toast } from "sonner";
import { MoreVertical, Pencil, Archive, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { archiveAccount, unarchiveAccount, setDefaultAccount } from "../actions";

// Undo window for the archive toast.
const UNDO_WINDOW_MS = 5000;

// Edit/archive overflow menu, shared by the accounts list row and the detail
// header. `onEdit` opens the rename sheet; `onArchived` (optional) fires after a
// successful archive so the detail page can navigate back to the list.
export function AccountActionsMenu({
  accountId,
  archived,
  isDefault = false,
  onEdit,
  onArchived,
}: {
  accountId: string;
  archived: boolean;
  /** When true the account is already the default — hide the "set default" item. */
  isDefault?: boolean;
  onEdit: () => void;
  onArchived?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  // Archive runs immediately (it's already reversible). The toast offers Undo,
  // which calls unarchiveAccount within the window — no native confirm dialog.
  function handleArchive() {
    startTransition(async () => {
      await archiveAccount({ id: accountId });
      onArchived?.();
    });
    toast("Đã lưu trữ tài khoản", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Hoàn tác",
        onClick: () => startTransition(() => void unarchiveAccount({ id: accountId })),
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tùy chọn tài khoản"
        className="flex h-9 w-9 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit()}>
          <Pencil size={16} aria-hidden="true" /> Sửa tên
        </DropdownMenuItem>
        {!archived && !isDefault && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await setDefaultAccount({ id: accountId });
                toast("Đã đặt làm tài khoản mặc định");
              });
            }}
          >
            <Star size={16} aria-hidden="true" /> Đặt làm mặc định
          </DropdownMenuItem>
        )}
        {!archived && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              handleArchive();
            }}
          >
            <Archive size={16} aria-hidden="true" /> Lưu trữ
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
