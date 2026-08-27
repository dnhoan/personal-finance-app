"use client";
import * as React from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatVnd } from "@/lib/vnd";
import { deleteBankLink } from "../actions";
import type { BankLinkRow as BankLinkRowData } from "../queries";
import type { BalanceDrift } from "../balance-drift-types";
import { BalanceDriftBadge } from "./balance-drift-badge";

// Account numbers are masked by default so the screen can be shown to someone
// (or screenshotted for support) without exposing the full number; the last four
// digits are enough to tell two linked accounts apart.
function maskNumber(value: string): string {
  return value.length <= 4 ? value : `•••• ${value.slice(-4)}`;
}

function formatSyncedAt(value: Date | null): string {
  if (!value) return "chưa có giao dịch nào";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export function BankLinkRow({
  link,
  drift,
}: {
  link: BankLinkRowData;
  drift: BalanceDrift | null;
}) {
  const [revealed, setRevealed] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteBankLink({ id: link.id });
      toast.success("Đã gỡ liên kết");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gỡ được liên kết");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 border-b border-border p-3.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-1.5 font-semibold text-fg">
          <span className="truncate">{link.gateway}</span>
          <span className="font-mono text-sm font-normal text-fg-muted">
            {revealed ? link.accountNumber : maskNumber(link.accountNumber)}
          </span>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Ẩn số tài khoản" : "Hiện số tài khoản"}
            className="rounded p-0.5 text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
          </button>
        </p>
        <p className="truncate text-[13px] text-fg-subtle">→ {link.accountName}</p>
        {drift ? (
          <BalanceDriftBadge drift={drift} />
        ) : (
          <p className="text-xs text-fg-subtle">
            {link.lastBankBalance === null
              ? "Chưa nhận số dư từ ngân hàng"
              : `Số dư ngân hàng: ${formatVnd(link.lastBankBalance)}`}{" "}
            · {formatSyncedAt(link.lastSyncedAt)}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirmDelete(true)}
        aria-label={`Gỡ liên kết ${link.gateway}`}
        className="shrink-0 rounded-md p-2 text-fg-subtle transition-colors hover:bg-surface-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Trash2 size={16} aria-hidden />
      </button>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Gỡ liên kết này?"
        description="Giao dịch đã đồng bộ vẫn giữ nguyên trong sổ. Ngân hàng này sẽ không tự vào ví nữa."
        confirmLabel="Gỡ liên kết"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
