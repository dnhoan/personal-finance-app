"use client";
import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { VndAmountInput } from "@/components/forms/vnd-amount-input";
import { cn } from "@/lib/utils";
import { updateTransaction } from "../actions";

export type EditableTx = {
  id: string;
  kind: "income" | "expense";
  amount: number; // magnitude (already abs'd by the caller)
  accountId: string;
  categoryId: string | null;
  note: string | null;
  occurredAt: Date;
};

const KIND_OPTS = [
  { value: "expense" as const, label: "Chi", icon: ArrowUpRight, active: "text-expense" },
  { value: "income" as const, label: "Thu", icon: ArrowDownLeft, active: "text-income" },
];

// Edit sheet for an income/expense row (transfers aren't editable). Prefilled
// from the row; preserves occurredAt and categoryId (the category picker lands
// in Phase 5). On save, calls updateTransaction.
export function TransactionEditSheet({
  tx,
  accounts,
  open,
  onOpenChange,
}: {
  tx: EditableTx;
  accounts: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [kind, setKind] = React.useState<"income" | "expense">(tx.kind);
  const [amount, setAmount] = React.useState<number | null>(tx.amount);
  const [accountId, setAccountId] = React.useState(tx.accountId);
  const [note, setNote] = React.useState(tx.note ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setKind(tx.kind);
      setAmount(tx.amount);
      setAccountId(tx.accountId);
      setNote(tx.note ?? "");
      setError(null);
    }
  }, [open, tx]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amount === null || amount <= 0) return setError("Nhập số tiền hợp lệ");
    if (!accountId) return setError("Chọn tài khoản");
    setSubmitting(true);
    try {
      await updateTransaction({
        id: tx.id,
        kind,
        amount,
        accountId,
        categoryId: tx.categoryId,
        occurredAt: tx.occurredAt,
        note,
      });
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label="Loại"
            className="grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1"
          >
            {KIND_OPTS.map(({ value, label, icon: Icon, active }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "flex min-h-[44px] items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors",
                  kind === value ? cn("bg-surface shadow-sm", active) : "text-fg-muted",
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">Số tiền</Label>
            <VndAmountInput
              id="edit-amount"
              defaultRaw={String(tx.amount)}
              aria-label="Số tiền"
              onValueChange={setAmount}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tài khoản</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn tài khoản" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note">Ghi chú</Label>
            <Input
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="h-12 w-full">
            {submitting ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
