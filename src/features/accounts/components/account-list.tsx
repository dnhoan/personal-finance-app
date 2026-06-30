"use client";
import * as React from "react";
import type { Route } from "next";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/back-link";
import { EmptyState } from "@/features/reports/components/empty-state";
import { groupAccounts } from "../account-grouping";
import type { AccountWithBalance } from "../queries";
import { AccountsSummaryCard } from "./accounts-summary-card";
import { AccountGroup } from "./account-group";
import { AccountFormSheet, type EditTarget } from "./account-form-sheet";
import { ENTER, enterDelay } from "@/lib/enter-animation";

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
  const isEmpty = accounts.length === 0;

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
      <div className={ENTER}>
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
      </div>

      {isEmpty ? (
        <div className={ENTER} style={enterDelay(60)}>
          <EmptyState
            icon={<Wallet size={32} aria-hidden="true" />}
            title="Chưa có tài khoản"
            description="Thêm tài khoản đầu tiên để bắt đầu theo dõi số dư và giao dịch."
          />
        </div>
      ) : (
        <>
          <div className={ENTER} style={enterDelay(60)}>
            <AccountsSummaryCard
              total={grouped.total}
              assetsTotal={grouped.assets.subtotal}
              liabilitiesTotal={grouped.liabilities.subtotal}
              assetCount={grouped.assets.rows.length}
              debtCount={grouped.liabilities.rows.length}
            />
          </div>

          <div className={ENTER} style={enterDelay(120)}>
            <AccountGroup
              title="Tài sản"
              subtotal={grouped.assets.subtotal}
              rows={grouped.assets.rows}
              hrefFor={detailHref}
              onEdit={openEdit}
            />
          </div>

          <div className={ENTER} style={enterDelay(180)}>
            <AccountGroup
              title="Nợ phải trả"
              subtotal={grouped.liabilities.subtotal}
              rows={grouped.liabilities.rows}
              hrefFor={detailHref}
              onEdit={openEdit}
            />
          </div>

          {grouped.archived.length > 0 && (
            <div className={`opacity-70 ${ENTER}`} style={enterDelay(240)}>
              <AccountGroup
                title="Đã lưu trữ"
                subtotal={grouped.archived.reduce((acc, r) => acc + r.balance, 0)}
                rows={grouped.archived}
                hrefFor={detailHref}
                onEdit={openEdit}
              />
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={openCreate}
        style={enterDelay(isEmpty ? 120 : 300)}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ENTER}`}
      >
        <Plus size={18} aria-hidden="true" /> Thêm tài khoản
      </button>

      <AccountFormSheet open={sheetOpen} onOpenChange={setSheetOpen} editing={editing} />
    </div>
  );
}
