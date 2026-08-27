"use client";
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryUnmatchedEvents } from "../inbox-actions";

/**
 * Warns about deliveries that matched no linked account.
 *
 * These are real transactions the bank already confirmed, sitting invisible
 * because their account number does not match any mapping — nearly always one
 * mistyped digit. SePay treats the 200 it already got as final, so this banner
 * and its retry are the only route back for that money.
 */
export function UnmatchedEventsNotice({ count }: { count: number }) {
  const [busy, setBusy] = React.useState(false);
  if (count === 0) return null;

  async function retry() {
    setBusy(true);
    try {
      const { imported } = await retryUnmatchedEvents();
      toast[imported > 0 ? "success" : "info"](
        imported > 0
          ? `Đã đưa ${imported} giao dịch vào danh sách chờ`
          : "Vẫn chưa khớp — kiểm tra lại số tài khoản",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thử lại được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
        <TriangleAlert size={15} aria-hidden />
        {count} giao dịch chưa khớp tài khoản nào
      </p>
      <p className="text-xs text-fg-muted">
        Ngân hàng đã báo những giao dịch này nhưng số tài khoản không khớp liên kết nào. Kiểm tra
        lại số tài khoản trong phần liên kết, rồi thử khớp lại.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" loading={busy} onClick={retry}>
          Thử khớp lại
        </Button>
        <Link
          href={"/settings/bank-sync" as Route}
          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Kiểm tra liên kết
        </Link>
      </div>
    </div>
  );
}
