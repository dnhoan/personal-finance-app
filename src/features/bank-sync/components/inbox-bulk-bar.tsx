"use client";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CategoryPicker,
  type CategoryPickerOption,
} from "@/features/categories/components/category-picker";
import { formatVnd } from "@/lib/vnd";

export type MergeCandidate = { inId: string; outId: string } | null;

/**
 * Sticky action bar for multi-select, docked above the bottom nav.
 *
 * Bulk assignment is offered only when every selected row shares one direction:
 * a category is either income or expense, so a mixed selection has no valid
 * single answer. Saying so up front beats silently skipping half the rows.
 */
export function InboxBulkBar({
  selectedCount,
  mixedKinds,
  bulkKind,
  categories,
  mergeCandidate,
  mergeBlockedReason,
  busy,
  onAssign,
  onMerge,
  onClear,
}: {
  selectedCount: number;
  mixedKinds: boolean;
  bulkKind: "income" | "expense";
  categories: CategoryPickerOption[];
  mergeCandidate: MergeCandidate;
  mergeBlockedReason: string | null;
  busy: boolean;
  onAssign: (categoryId: string) => void;
  onMerge: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 pb-[calc(env(safe-area-inset-bottom)+72px)] backdrop-blur md:pb-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-fg">Đã chọn {selectedCount}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Bỏ chọn
          </Button>
        </div>

        {mixedKinds ? (
          <p className="text-xs text-fg-muted">
            Đang chọn cả giao dịch tiền vào và tiền ra — chọn cùng một loại để gán danh mục hàng
            loạt.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategoryPicker
                categories={categories}
                kind={bulkKind}
                value={null}
                onChange={(id) => id && onAssign(id)}
              />
            </div>
          </div>
        )}

        {mergeCandidate ? (
          <Button type="button" variant="outline" loading={busy} onClick={onMerge}>
            <ArrowLeftRight size={16} aria-hidden />
            Đây là chuyển khoản nội bộ
          </Button>
        ) : null}

        {mergeBlockedReason ? <p className="text-xs text-fg-muted">{mergeBlockedReason}</p> : null}
      </div>
    </div>
  );
}

// Human-readable explanation of a near-miss pair. A gap is almost always a
// transfer fee; merging anyway would skew the balance by exactly that gap, which
// is the very error the merge exists to remove — so the difference is named and
// the decision left to the user.
export function describeMergeGap(inAmount: number, outAmount: number): string {
  const gap = Math.abs(Math.abs(outAmount) - Math.abs(inAmount));
  return `Chênh ${formatVnd(gap)} — có thể là phí chuyển khoản. Sửa số tiền cho khớp rồi ghép, hoặc để riêng hai giao dịch.`;
}
