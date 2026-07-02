"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { ACCOUNT_META } from "../account-meta";
import type { AccountWithBalance } from "../queries";
import { AccountActionsMenu } from "./account-actions-menu";
import { AccountFormSheet, type EditTarget } from "./account-form-sheet";

// Gradient hero + back link + overflow menu for the account detail page. Adding a
// transaction happens through the global add button (bottom-nav ＋ / desktop FAB);
// rename lives in the overflow menu.
export function AccountDetailHeader({ account }: { account: AccountWithBalance }) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState<EditTarget>(null);

  const meta = ACCOUNT_META[account.type];
  const Icon = meta.icon;

  function openRename() {
    setRenaming({
      id: account.id,
      name: account.name,
      type: account.type,
      currentBalance: account.balance,
    });
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
          isDefault={account.isDefault}
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

      <AccountFormSheet
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        editing={renaming}
      />
    </div>
  );
}
