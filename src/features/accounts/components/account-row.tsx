"use client";
import Link from "next/link";
import type { Route } from "next";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { ACCOUNT_META } from "../account-meta";
import type { AccountWithBalance } from "../queries";
import { AccountActionsMenu } from "./account-actions-menu";

// Debt-account status → pill label/tone. Only `partial`/`settled` surface a pill;
// `open` debts and all non-debt accounts show none.
const DEBT_STATUS_PILL: Partial<
  Record<AccountWithBalance["status"], { label: string; className: string }>
> = {
  partial: { label: "Một phần", className: "bg-surface-muted text-fg-muted" },
  settled: { label: "Đã trả", className: "bg-income-soft text-income" },
};

// One account row: tinted icon bubble + name/type + balance (+ optional debt
// pill). The main region links to detail (or /debts for debt accounts); the
// actions menu sits OUTSIDE the link so the row isn't a nested interactive.
export function AccountRow({
  account,
  href,
  onEdit,
}: {
  account: AccountWithBalance;
  href: Route;
  onEdit: () => void;
}) {
  const meta = ACCOUNT_META[account.type];
  const Icon = meta.icon;
  const pill = account.type === "debt" ? DEBT_STATUS_PILL[account.status] : undefined;

  return (
    <div className="flex min-h-[64px] items-center gap-3 px-4 py-3">
      <Link
        href={href}
        aria-label={account.name}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-fg-muted">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{account.name}</p>
          <p className="text-sm text-fg-subtle">{meta.label}</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-semibold tabular-nums",
              account.balance < 0 ? "text-expense" : "text-fg",
            )}
          >
            {formatVnd(account.balance)}
          </p>
          {pill ? (
            <span
              className={cn(
                "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                pill.className,
              )}
            >
              {pill.label}
            </span>
          ) : null}
        </div>
      </Link>
      <AccountActionsMenu
        accountId={account.id}
        archived={account.status === "archived"}
        onEdit={onEdit}
      />
    </div>
  );
}
