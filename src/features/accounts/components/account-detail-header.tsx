"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ArrowLeftRight, Plus, Edit3 } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import {
  QuickAddSheet,
  type AccountOption,
} from "@/features/transactions/components/quick-add-sheet";
import type { TxKind } from "@/features/transactions/components/kind-toggle";
import { ACCOUNT_META } from "../account-meta";
import type { AccountWithBalance } from "../queries";
import { AccountActionsMenu } from "./account-actions-menu";
import { AccountFormSheet, type EditTarget } from "./account-form-sheet";

// Gradient hero + back link + overflow menu + 3 quick-action pills for the
// account detail page. Mounts QuickAddSheet directly (its own open state) instead
// of QuickAddLauncher, so this page gets the sheet without a second FAB. The
// pills pre-select this account (Add → income/expense; Transfer → from = this).
export function AccountDetailHeader({
  account,
  accounts,
}: {
  account: AccountWithBalance;
  /** Active accounts for the transfer picker. */
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [quickAddKind, setQuickAddKind] = React.useState<TxKind>("expense");
  const [renaming, setRenaming] = React.useState<EditTarget>(null);

  const meta = ACCOUNT_META[account.type];
  const Icon = meta.icon;

  function openQuickAdd(kind: TxKind) {
    setQuickAddKind(kind);
    setQuickAddOpen(true);
  }

  function openRename() {
    setRenaming({ id: account.id, name: account.name });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/accounts"
          className="flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
        >
          <ChevronLeft size={18} aria-hidden="true" /> Tài khoản
        </Link>
        <AccountActionsMenu
          accountId={account.id}
          archived={account.status === "archived"}
          onEdit={openRename}
          onArchived={() => router.push("/accounts")}
        />
      </div>

      <section
        className="rounded-2xl p-6 text-primary-foreground"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 80%, white) 100%)",
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider opacity-70">{meta.label}</p>
            <p className="truncate font-semibold">{account.name}</p>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-wider opacity-70">Số dư</p>
        <p
          className="mt-1 text-4xl font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {formatVnd(account.balance)}
        </p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <PillButton primary onClick={() => openQuickAdd("transfer")}>
          <ArrowLeftRight size={16} aria-hidden="true" /> Chuyển khoản
        </PillButton>
        <PillButton onClick={() => openQuickAdd("expense")}>
          <Plus size={16} aria-hidden="true" /> Thêm
        </PillButton>
        <PillButton onClick={openRename}>
          <Edit3 size={16} aria-hidden="true" /> Chỉnh sửa
        </PillButton>
      </div>

      <QuickAddSheet
        accounts={accounts}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultAccountId={account.id}
        defaultKind={quickAddKind}
      />
      <AccountFormSheet
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        editing={renaming}
      />
    </div>
  );
}

function PillButton({
  children,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-surface text-fg hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
