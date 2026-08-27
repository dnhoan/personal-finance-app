import Link from "next/link";
import type { Route } from "next";
import { Inbox } from "lucide-react";

// Two distinct empty states. A user with no bank link has nothing pending
// because nothing is connected yet — pointing them at setup is the useful
// answer. A linked user with an empty inbox is simply done, and telling them to
// go configure something would imply a problem that does not exist.
export function InboxEmptyState({ hasLink }: { hasLink: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
        <Inbox size={22} aria-hidden />
      </span>
      {hasLink ? (
        <>
          <p className="font-semibold text-fg">Không có giao dịch nào chờ phân loại</p>
          <p className="max-w-xs text-sm text-fg-muted">
            Giao dịch mới từ ngân hàng sẽ xuất hiện ở đây để bạn chọn danh mục.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-fg">Chưa liên kết ngân hàng nào</p>
          <p className="max-w-xs text-sm text-fg-muted">
            Liên kết tài khoản ngân hàng để giao dịch tự động vào ứng dụng.
          </p>
          <Link
            href={"/settings/bank-sync" as Route}
            className="mt-1 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Liên kết ngân hàng →
          </Link>
        </>
      )}
    </div>
  );
}
