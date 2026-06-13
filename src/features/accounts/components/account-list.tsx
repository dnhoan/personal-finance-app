"use client";
import * as React from "react";
import { Plus, MoreVertical, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { ACCOUNT_META } from "../account-meta";
import type { AccountWithBalance } from "../queries";
import { archiveAccount } from "../actions";
import { AccountFormSheet, type EditTarget } from "./account-form-sheet";

// Account manager: list of balance cards + add/rename/archive. Owns the form
// sheet open state. Balance is computed server-side (initial + signed tx sum).
export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditTarget>(null);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(account: AccountWithBalance) {
    setEditing({ id: account.id, name: account.name });
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
          Tài khoản
        </h1>
        <Button size="sm" onClick={openCreate}>
          <Plus size={18} aria-hidden="true" /> Thêm
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-fg-muted">
          Chưa có tài khoản. Thêm tài khoản đầu tiên để bắt đầu.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => {
            const meta = ACCOUNT_META[account.type];
            const Icon = meta.icon;
            const archived = account.status === "archived";
            return (
              <li key={account.id}>
                <Card className="flex min-h-[64px] items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{account.name}</p>
                    <p className="text-sm text-fg-muted">
                      {meta.label}
                      {archived ? " · Đã lưu trữ" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      account.balance < 0 ? "text-expense" : "text-fg",
                    )}
                  >
                    {formatVnd(account.balance)}
                  </span>
                  <AccountMenu
                    accountId={account.id}
                    archived={archived}
                    onEdit={() => openEdit(account)}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AccountFormSheet open={sheetOpen} onOpenChange={setSheetOpen} editing={editing} />
    </div>
  );
}

function AccountMenu({
  accountId,
  archived,
  onEdit,
}: {
  accountId: string;
  archived: boolean;
  onEdit: () => void;
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
                startTransition(() => void archiveAccount({ id: accountId }));
            }}
          >
            <Archive size={16} aria-hidden="true" /> Lưu trữ
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
