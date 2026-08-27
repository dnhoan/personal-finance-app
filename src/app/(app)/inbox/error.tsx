"use client";
import { Button } from "@/components/ui/button";

export default function InboxError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <p className="font-semibold text-fg">Không tải được danh sách chờ</p>
      <p className="max-w-xs text-sm text-fg-muted">
        Giao dịch của bạn vẫn an toàn — chỉ màn hình này chưa tải được.
      </p>
      <Button type="button" variant="outline" onClick={reset}>
        Thử lại
      </Button>
    </div>
  );
}
