"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CategoryPicker,
  type CategoryPickerOption,
} from "@/features/categories/components/category-picker";
import { deleteTransaction } from "@/features/transactions/actions/delete";
import { InboxRow } from "./inbox-row";
import { InboxBulkBar, describeMergeGap, type MergeCandidate } from "./inbox-bulk-bar";
import { InboxEmptyState } from "./inbox-empty-state";
import {
  confirmManyTransactions,
  confirmTransaction,
  mergeAsTransfer,
  undoBulkConfirm,
} from "../inbox-actions";
import { MERGE_MAX_DAY_GAP } from "../inbox-schemas";
import type { PendingTxItem } from "../inbox-queries";

// Above this many rows, a bulk assignment gets a confirmation step — the undo
// toast is easy to miss, and a mis-tap across a long list is tedious to unpick.
const BULK_CONFIRM_THRESHOLD = 20;

export function InboxList({
  transactions,
  categories,
  suggestions,
  hasLink,
}: {
  transactions: PendingTxItem[];
  categories: CategoryPickerOption[];
  suggestions: CategoryPickerOption[];
  hasLink: boolean;
}) {
  const [selecting, setSelecting] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [pickerFor, setPickerFor] = React.useState<PendingTxItem | null>(null);
  const [deleteFor, setDeleteFor] = React.useState<PendingTxItem | null>(null);
  const [pendingBulk, setPendingBulk] = React.useState<string | null>(null);

  if (transactions.length === 0) return <InboxEmptyState hasLink={hasLink} />;

  const selectedRows = transactions.filter((t) => selected.has(t.id));
  const kinds = new Set(selectedRows.map((t) => t.kind));
  const mixedKinds = kinds.size > 1;
  const bulkKind: "income" | "expense" = kinds.has("income") ? "income" : "expense";

  // A merge is offered only for exactly one incoming + one outgoing row on
  // different accounts. Amount and date are checked here so the button never
  // appears for a pair the server would reject.
  const { mergeCandidate, mergeBlockedReason } = evaluateMerge(selectedRows);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function assignOne(tx: PendingTxItem, categoryId: string) {
    setBusyId(tx.id);
    try {
      const result = await confirmTransaction({ id: tx.id, categoryId });
      if (!result.ok) toast.info(result.message ?? "Không cập nhật được");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được");
    } finally {
      setBusyId(null);
      setPickerFor(null);
    }
  }

  async function runBulk(categoryId: string) {
    setBulkBusy(true);
    const ids = selectedRows.map((t) => t.id);
    try {
      const { changed } = await confirmManyTransactions({ ids, categoryId });
      exitSelection();
      toast.success(`Đã phân loại ${changed} giao dịch`, {
        action: {
          label: "Hoàn tác",
          onClick: async () => {
            try {
              const { reverted } = await undoBulkConfirm({ ids });
              toast.success(`Đã hoàn tác ${reverted} giao dịch`);
            } catch {
              toast.error("Không hoàn tác được");
            }
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không phân loại được");
    } finally {
      setBulkBusy(false);
      setPendingBulk(null);
    }
  }

  function requestBulk(categoryId: string) {
    if (selectedRows.length > BULK_CONFIRM_THRESHOLD) return setPendingBulk(categoryId);
    void runBulk(categoryId);
  }

  async function runMerge() {
    if (!mergeCandidate) return;
    setBulkBusy(true);
    try {
      await mergeAsTransfer(mergeCandidate);
      exitSelection();
      toast.success("Đã ghép thành chuyển khoản nội bộ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không ghép được");
    } finally {
      setBulkBusy(false);
    }
  }

  async function runDelete(tx: PendingTxItem) {
    setBusyId(tx.id);
    try {
      await deleteTransaction({ id: tx.id });
      toast.success("Đã xóa giao dịch");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xóa được");
    } finally {
      setBusyId(null);
      setDeleteFor(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
          Chờ phân loại ({transactions.length})
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (selecting ? exitSelection() : setSelecting(true))}
        >
          {selecting ? "Xong" : "Chọn"}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {transactions.map((tx) => (
          <InboxRow
            key={tx.id}
            tx={tx}
            suggestions={suggestions}
            selecting={selecting}
            selected={selected.has(tx.id)}
            busy={busyId === tx.id}
            onToggleSelect={() => toggle(tx.id)}
            onQuickAssign={(categoryId) => void assignOne(tx, categoryId)}
            onOpenPicker={() => setPickerFor(tx)}
            onDelete={() => setDeleteFor(tx)}
          />
        ))}
      </Card>

      <InboxBulkBar
        selectedCount={selectedRows.length}
        mixedKinds={mixedKinds}
        bulkKind={bulkKind}
        categories={categories}
        mergeCandidate={mergeCandidate}
        mergeBlockedReason={mergeBlockedReason}
        busy={bulkBusy}
        onAssign={requestBulk}
        onMerge={() => void runMerge()}
        onClear={exitSelection}
      />

      <Sheet open={pickerFor !== null} onOpenChange={(open) => !open && setPickerFor(null)}>
        <SheetContent title="Chọn danh mục">
          {pickerFor ? (
            <CategoryPicker
              categories={categories}
              kind={pickerFor.kind === "income" ? "income" : "expense"}
              value={null}
              onChange={(id) => id && void assignOne(pickerFor, id)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteFor !== null}
        onOpenChange={(open) => !open && setDeleteFor(null)}
        title="Xóa giao dịch này?"
        description="Số dư tài khoản sẽ thay đổi theo. Giao dịch sẽ không tự đồng bộ lại."
        confirmLabel="Xóa"
        destructive
        onConfirm={() => deleteFor && void runDelete(deleteFor)}
      />

      <ConfirmDialog
        open={pendingBulk !== null}
        onOpenChange={(open) => !open && setPendingBulk(null)}
        title={`Phân loại ${selectedRows.length} giao dịch?`}
        description="Tất cả sẽ được gán cùng một danh mục. Bạn có thể hoàn tác ngay sau đó."
        confirmLabel="Phân loại"
        onConfirm={() => pendingBulk && void runBulk(pendingBulk)}
      />
    </div>
  );
}

// Decides whether the selected pair can become a transfer, and explains the
// nearest miss when it cannot. Mirrors the server's rules so the button state
// and the server's answer never disagree.
function evaluateMerge(rows: PendingTxItem[]): {
  mergeCandidate: MergeCandidate;
  mergeBlockedReason: string | null;
} {
  if (rows.length !== 2) return { mergeCandidate: null, mergeBlockedReason: null };

  const incoming = rows.find((r) => r.kind === "income");
  const outgoing = rows.find((r) => r.kind === "expense");
  if (!incoming || !outgoing) return { mergeCandidate: null, mergeBlockedReason: null };
  if (incoming.accountId === outgoing.accountId) {
    return {
      mergeCandidate: null,
      mergeBlockedReason: "Hai giao dịch đang ở cùng một tài khoản nên không phải chuyển khoản.",
    };
  }

  const gapDays =
    Math.abs(new Date(incoming.occurredAt).getTime() - new Date(outgoing.occurredAt).getTime()) /
    86_400_000;
  if (gapDays > MERGE_MAX_DAY_GAP) {
    return {
      mergeCandidate: null,
      mergeBlockedReason: `Hai giao dịch cách nhau quá ${MERGE_MAX_DAY_GAP} ngày nên không ghép tự động được.`,
    };
  }

  if (Math.abs(incoming.amount) !== Math.abs(outgoing.amount)) {
    return {
      mergeCandidate: null,
      mergeBlockedReason: describeMergeGap(incoming.amount, outgoing.amount),
    };
  }

  return {
    mergeCandidate: { inId: incoming.id, outId: outgoing.id },
    mergeBlockedReason: null,
  };
}
