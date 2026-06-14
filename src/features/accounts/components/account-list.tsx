"use client";
import * as React from "react";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/back-link";
import { groupAccounts } from "../account-grouping";
import type { AccountWithBalance } from "../queries";
import { AccountsSummaryCard } from "./accounts-summary-card";
import { AccountGroup } from "./account-group";
import { AccountFormSheet, type EditTarget } from "./account-form-sheet";

// Account detail works for any account, so debt rows link there too for now;
// switch debt rows to /debts when that surface ships.
function detailHref(account: AccountWithBalance): Route {
  return `/accounts/${account.id}` as Route;
}

// Accounts screen orchestrator: total card → Assets/Liabilities groups → archived
// (muted) → dashed add button. Owns the create/rename sheet state; balances,
// totals, and grouping are computed upstream + in the pure groupAccounts helper.
export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditTarget>(null);

  const grouped = React.useMemo(() => groupAccounts(accounts), [accounts]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(account: AccountWithBalance) {
    setEditing({ id: account.id, name: account.name });
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        href="/settings"
        label="Tài khoản"
        action={
          <Button
            size="icon"
            className="rounded-full"
            aria-label="Thêm tài khoản"
            onClick={openCreate}
          >
            <Plus size={20} aria-hidden="true" />
          </Button>
        }
      />

      <AccountsSummaryCard
        total={grouped.total}
        assetCount={grouped.assets.rows.length}
        debtCount={grouped.liabilities.rows.length}
      />

      <AccountGroup
        title="Tài sản"
        subtotal={grouped.assets.subtotal}
        rows={grouped.assets.rows}
        hrefFor={detailHref}
        onEdit={openEdit}
      />

      <AccountGroup
        title="Nợ phải trả"
        subtotal={grouped.liabilities.subtotal}
        rows={grouped.liabilities.rows}
        hrefFor={detailHref}
        onEdit={openEdit}
      />

      {grouped.archived.length > 0 && (
        <div className="opacity-70">
          <AccountGroup
            title="Đã lưu trữ"
            subtotal={grouped.archived.reduce((acc, r) => acc + r.balance, 0)}
            rows={grouped.archived}
            hrefFor={detailHref}
            onEdit={openEdit}
          />
        </div>
      )}

      <button
        type="button"
        onClick={openCreate}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus size={18} aria-hidden="true" /> Thêm tài khoản
      </button>

      <AccountFormSheet open={sheetOpen} onOpenChange={setSheetOpen} editing={editing} />
    </div>
  );
}
