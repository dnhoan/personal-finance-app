"use client";
import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { VndAmountInput } from "@/components/forms/vnd-amount-input";
import { updateTransaction } from "../actions";
import type { EditableTx, TxEditOptions } from "../lib/to-editable-tx";
import {
  editAccountOptions,
  editCategoryOptions,
  initialEditState,
  isDebtAccountType,
  naturalSingleAccount,
  openedRowSide,
  type EditFormState,
} from "../lib/transaction-edit-form-state";
import { KindToggle, type TxKind } from "./kind-toggle";
import { TransactionEditFields } from "./transaction-edit-fields";

// Edit sheet for any row, including switching between Chi / Thu / Chuyển.
// The opened row keeps its id in every case (the server only adds or removes the
// transfer counterpart), so saving never needs a redirect. The date is not
// editable here — the row keeps its timestamp.
export function TransactionEditSheet({
  tx,
  options,
  open,
  onOpenChange,
}: {
  tx: EditableTx;
  options: TxEditOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = React.useState<EditFormState>(() => initialEditState(tx));
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Reset only when the sheet opens. A revalidation while it is open hands in a
  // new `tx` object; resetting then would wipe what the user typed while the
  // uncontrolled amount input kept showing it (and Save sent the old amount).
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(initialEditState(tx));
      setError(null);
    }
    wasOpen.current = open;
  }, [open, tx]);

  const patch = (p: Partial<EditFormState>) => setForm((f) => ({ ...f, ...p }));
  const isBankSync = tx.source === "bank_sync";
  const involvesTransfer = tx.kind === "transfer" || form.kind === "transfer";
  const accountOptions = editAccountOptions(tx, options.accounts, involvesTransfer);
  const categories = editCategoryOptions(tx, options.categories);
  // A kind change on a debt/receivable account would silently move its balance
  // (those balances ignore transfers) — the server refuses it too. A transfer
  // already on one stays editable for amount/note.
  const disabledKinds: TxKind[] = !isDebtAccountType(tx.accountType)
    ? []
    : tx.kind === "transfer"
      ? ["income", "expense"]
      : ["transfer"];

  function handleKindChange(next: TxKind) {
    if (next === form.kind) return;
    const p: Partial<EditFormState> = { kind: next, categoryId: null };
    if (tx.kind === "transfer" && next !== "transfer") {
      p.accountId = naturalSingleAccount(tx, next, form);
    }
    // Carry an account picked in this session onto the opened row's side.
    if (tx.kind !== "transfer" && next === "transfer" && !isBankSync) {
      p[openedRowSide(tx) === "from" ? "fromId" : "toId"] = form.accountId;
    }
    patch(p);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { kind, amount } = form;
    if (amount === null || amount <= 0) return setError("Nhập số tiền hợp lệ");
    const common = { id: tx.id, amount, note: form.note, merchant: tx.merchant ?? undefined };
    if (kind === "transfer") {
      if (!form.fromId || !form.toId) return setError("Chọn tài khoản nguồn và đích");
      if (form.fromId === form.toId) return setError("Tài khoản nguồn và đích phải khác nhau");
    } else if (!form.accountId) {
      return setError("Chọn tài khoản");
    }
    setSubmitting(true);
    try {
      const res = await updateTransaction(
        kind === "transfer"
          ? { ...common, kind, fromAccountId: form.fromId, toAccountId: form.toId }
          : { ...common, kind, accountId: form.accountId, categoryId: form.categoryId },
      );
      if (!res.ok) return setError(res.message);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Sửa giao dịch">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
          <KindToggle value={form.kind} onChange={handleKindChange} disabledKinds={disabledKinds} />

          {form.kind === "transfer" && tx.kind !== "transfer" && tx.goalId && (
            <p className="text-xs text-warning" role="note">
              Mục tiêu sẽ bị gỡ — giao dịch chuyển khoản không gắn mục tiêu.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">Số tiền</Label>
            <VndAmountInput
              id="edit-amount"
              defaultRaw={String(tx.amount)}
              aria-label="Số tiền"
              onValueChange={(amount) => patch({ amount })}
            />
          </div>

          <TransactionEditFields
            kind={form.kind}
            accountOptions={accountOptions}
            categories={categories}
            accountId={form.accountId}
            onAccountChange={(accountId) => patch({ accountId })}
            // Bank-synced rows keep their account when the kind changes; a plain
            // income/expense edit stays as free as before.
            accountLocked={isBankSync && tx.kind === "transfer"}
            categoryId={form.categoryId}
            onCategoryChange={(categoryId) => patch({ categoryId })}
            fromId={form.fromId}
            onFromChange={(fromId) => patch({ fromId })}
            toId={form.toId}
            onToChange={(toId) => patch({ toId })}
            lockedSide={isBankSync ? openedRowSide(tx) : null}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note">Ghi chú</Label>
            <Input
              id="edit-note"
              value={form.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="Tùy chọn…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="h-12 w-full">
            {submitting ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
