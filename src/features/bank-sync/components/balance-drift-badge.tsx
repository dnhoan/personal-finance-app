import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatVnd } from "@/lib/vnd";
import { isSyncStale, STALE_SYNC_DAYS, type BalanceDrift } from "../balance-drift-types";

function formatSyncedAt(value: Date | null): string {
  if (!value) return "chưa nhận dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

/**
 * Reconciliation state for one linked account.
 *
 * The causes below are ordered by how likely they are, and that order is the
 * point: "your opening balance is wrong" is LAST because acting on it rewrites
 * `initial_balance`, which every historical net-worth bucket reads. Putting it
 * first would send users to corrupt their history in response to a mismatch that
 * usually clears itself once the inbox is emptied.
 */
export function BalanceDriftBadge({ drift }: { drift: BalanceDrift }) {
  const stale = isSyncStale(drift.lastSyncedAt);

  if (drift.lastBankBalance === null) {
    return (
      <p className="text-xs text-fg-subtle">Chưa nhận số dư từ ngân hàng cho tài khoản này.</p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-fg-muted">
        Số dư ngân hàng báo về:{" "}
        <span className="tabular-nums">{formatVnd(drift.lastBankBalance)}</span> ·{" "}
        {formatSyncedAt(drift.lastSyncedAt)}
      </p>

      {stale ? (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <Clock size={13} aria-hidden />
          Chưa nhận dữ liệu từ ngân hàng {STALE_SYNC_DAYS} ngày
        </p>
      ) : null}

      {!drift.showBadge ? null : drift.drift === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-income">
          <CheckCircle2 size={13} aria-hidden />
          Khớp với ngân hàng
        </p>
      ) : (
        <details className="rounded-lg border border-warning/40 bg-warning/10 p-2.5">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertCircle size={13} aria-hidden />
            Lệch {formatVnd(Math.abs(drift.drift!))} so với ngân hàng
          </summary>
          <div className="mt-2 flex flex-col gap-1.5 text-xs text-fg-muted">
            <p>Số liệu tính tới hôm nay, chưa gồm giao dịch định kỳ của những ngày tới.</p>
            <p className="font-medium text-fg">Thường là do một trong các nguyên nhân sau:</p>
            <ol className="flex list-inside list-decimal flex-col gap-1">
              <li>Còn giao dịch chờ phân loại hoặc đồng bộ chưa xong — xem mục Chờ phân loại.</li>
              <li>Có giao dịch chưa khớp tài khoản — thử khớp lại ở phần liên kết.</li>
              <li>Ngân hàng không báo giao dịch tiền ra — cần nhập tay các khoản chi đó.</li>
              <li>
                Có giao dịch nhập tay trùng với giao dịch ngân hàng đã đồng bộ — xóa bản trùng.
              </li>
              <li>
                Có giao dịch phát sinh trước khi liên kết — chỉ khi đã loại trừ hết các nguyên nhân
                trên mới nên sửa số dư ban đầu của tài khoản.
              </li>
            </ol>
          </div>
        </details>
      )}
    </div>
  );
}
