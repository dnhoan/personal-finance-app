"use client";
import * as React from "react";
import { MoreVertical, Pencil, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { archiveAccount } from "../actions";

// Edit/archive overflow menu, shared by the accounts list row and the detail
// header. `onEdit` opens the rename sheet; `onArchived` (optional) fires after a
// successful archive so the detail page can navigate back to the list.
export function AccountActionsMenu({
  accountId,
  archived,
  onEdit,
  onArchived,
}: {
  accountId: string;
  archived: boolean;
  onEdit: () => void;
  onArchived?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
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
        {!archived && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              if (window.confirm("Lưu trữ tài khoản này? Giao dịch cũ vẫn được giữ lại."))
                startTransition(async () => {
                  await archiveAccount({ id: accountId });
                  onArchived?.();
                });
            }}
          >
            <Archive size={16} aria-hidden="true" /> Lưu trữ
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
