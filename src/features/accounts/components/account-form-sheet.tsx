"use client";
import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { VndAmountInput } from "@/components/forms/vnd-amount-input";
import { cn } from "@/lib/utils";
import { ACCOUNT_META, type AccountType } from "../account-meta";
import { ACCOUNT_TYPES } from "../schemas";
import { createAccount, updateAccount } from "../actions";

export type EditTarget = {
  id: string;
  name: string;
  type: AccountType;
  /** The account's current (derived) balance — seeds the edit field. */
  currentBalance: number;
} | null;

// Create or edit an account. Create sets type + opening balance; edit changes the
// name and current balance (type stays immutable). The edit field shows the
// current balance; the action back-solves the opening balance so the displayed
// balance matches what the user typed.
export function AccountFormSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EditTarget;
}) {
  const isEdit = editing !== null;
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("cash");
  // In create mode this is the opening balance; in edit mode, the target current
  // balance. Seeded to the account's current balance when editing.
  const [balanceAmount, setBalanceAmount] = React.useState<number | null>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setType(editing?.type ?? "cash");
      setBalanceAmount(editing?.currentBalance ?? 0);
      setError(null);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      // Move focus to the offending field so the error is reachable for keyboard
      // and screen-reader users, not just shown.
      nameRef.current?.focus();
      return setError("Nhập tên tài khoản");
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateAccount({
          id: editing.id,
          name: name.trim(),
          currentBalance: balanceAmount ?? 0,
        });
      } else {
        await createAccount({ name: name.trim(), type, initialBalance: balanceAmount ?? 0 });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  // Balance field label: create shows the opening amount, edit shows the current
  // amount; wording adapts to debt/receivable (which track an outstanding sum).
  const balanceLabel = isEdit
    ? type === "debt"
      ? "Số nợ còn lại"
      : type === "receivable"
        ? "Còn phải thu"
        : "Số dư hiện tại"
    : type === "debt"
      ? "Tổng nợ ban đầu"
      : type === "receivable"
        ? "Tổng cho vay ban đầu"
        : "Số dư ban đầu";

  // Dirty if the name or balance diverged from their initial values (0 for a fresh
  // create). Gates the discard guard so untouched opens close free.
  const dirty =
    name.trim() !== (editing?.name ?? "") ||
    (balanceAmount ?? 0) !== (editing?.currentBalance ?? 0);

  function requestClose(next: boolean) {
    if (next) return onOpenChange(true);
    if (!dirty) return onOpenChange(false);
    toast("Bỏ thay đổi chưa lưu?", {
      action: { label: "Bỏ", onClick: () => onOpenChange(false) },
    });
  }

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent title={isEdit ? "Sửa tài khoản" : "Thêm tài khoản"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name">Tên tài khoản</Label>
            <Input
              ref={nameRef}
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tiền mặt…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label>Loại tài khoản</Label>
              <div role="radiogroup" aria-label="Loại tài khoản" className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map((t) => {
                  const m = ACCOUNT_META[t];
                  const Icon = m.icon;
                  const selected = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setType(t)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]",
                        selected
                          ? "border-accent bg-accent/10 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          m.tint,
                        )}
                      >
                        <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-fg">
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Balance field. Create: opening balance. Edit: the current balance,
              seeded from the account's derived balance; the action back-solves the
              opening balance so the displayed balance matches. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-balance">{balanceLabel}</Label>
            <VndAmountInput
              id="acc-balance"
              defaultRaw={String(editing?.currentBalance ?? 0)}
              aria-label={balanceLabel}
              onValueChange={setBalanceAmount}
            />
            {!isEdit && (type === "debt" || type === "receivable") && (
              <p className="text-[12px] text-fg-muted">
                {type === "debt"
                  ? "Nhập tổng số tiền bạn nợ. Ghi một khoản chi vào tài khoản này để trả dần. Mẹo: đặt tên như “Vay từ Mẹ”."
                  : "Nhập tổng số tiền người khác nợ bạn. Ghi một khoản thu vào tài khoản này khi được trả. Mẹo: đặt tên như “Cho Hùng vay”."}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="h-12 w-full">
            {submitting ? "Đang lưu…" : "Lưu"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
