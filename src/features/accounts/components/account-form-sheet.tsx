"use client";
import * as React from "react";
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
import { ACCOUNT_META, type AccountType } from "../account-meta";
import { ACCOUNT_TYPES } from "../schemas";
import { createAccount, renameAccount } from "../actions";

export type EditTarget = { id: string; name: string } | null;

// Create (type + opening balance) or rename (name only) an account. Type and
// opening balance are immutable after creation — renaming changes the name only.
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
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("cash");
  const [initialBalance, setInitialBalance] = React.useState<number | null>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setType("cash");
      setInitialBalance(0);
      setError(null);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Nhập tên tài khoản");
    setSubmitting(true);
    try {
      if (isEdit) {
        await renameAccount({ id: editing.id, name: name.trim() });
      } else {
        await createAccount({ name: name.trim(), type, initialBalance: initialBalance ?? 0 });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={isEdit ? "Sửa tài khoản" : "Thêm tài khoản"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name">Tên tài khoản</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tiền mặt"
              autoComplete="off"
            />
          </div>

          {!isEdit && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Loại tài khoản</Label>
                <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACCOUNT_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-balance">
                  {type === "debt"
                    ? "Tổng nợ ban đầu"
                    : type === "receivable"
                      ? "Tổng cho vay ban đầu"
                      : "Số dư ban đầu"}
                </Label>
                <VndAmountInput
                  id="acc-balance"
                  defaultRaw="0"
                  aria-label="Số dư ban đầu"
                  onValueChange={setInitialBalance}
                />
                {(type === "debt" || type === "receivable") && (
                  <p className="text-[12px] text-fg-muted">
                    {type === "debt"
                      ? "Nhập tổng số tiền bạn nợ. Ghi một khoản chi vào tài khoản này để trả dần. Mẹo: đặt tên như “Vay từ Mẹ”."
                      : "Nhập tổng số tiền người khác nợ bạn. Ghi một khoản thu vào tài khoản này khi được trả. Mẹo: đặt tên như “Cho Hùng vay”."}
                  </p>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="h-12 w-full">
            {submitting ? "Đang lưu…" : "Lưu"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
