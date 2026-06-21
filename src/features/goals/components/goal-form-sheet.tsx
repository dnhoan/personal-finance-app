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
import { createGoal, updateGoal } from "../actions";
import type { GoalWithProgress } from "../queries";

export type GoalEditTarget = Pick<
  GoalWithProgress,
  "id" | "name" | "targetAmount" | "targetDate" | "accountId"
> | null;

type AccountOption = { id: string; name: string };

const NO_ACCOUNT = "none";

// Create or edit a savings goal: name, target amount, optional target date, and an
// optional informational account link.
export function GoalFormSheet({
  open,
  onOpenChange,
  editing,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoalEditTarget;
  accounts: AccountOption[];
}) {
  const isEdit = editing !== null;
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [targetDate, setTargetDate] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>(NO_ACCOUNT);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setAmount(editing?.targetAmount ?? null);
      setTargetDate(editing?.targetDate ?? "");
      setAccountId(editing?.accountId ?? NO_ACCOUNT);
      setError(null);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Nhập tên mục tiêu");
    if (amount === null || amount <= 0) return setError("Nhập số tiền mục tiêu hợp lệ");
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      targetAmount: amount,
      targetDate: targetDate || null,
      accountId: accountId === NO_ACCOUNT ? null : accountId,
    };
    try {
      if (isEdit) {
        await updateGoal({ id: editing.id, ...payload });
      } else {
        await createGoal(payload);
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
      <SheetContent title={isEdit ? "Sửa mục tiêu" : "Mục tiêu mới"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Tên mục tiêu</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Du lịch Nhật Bản"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-amount">Số tiền mục tiêu</Label>
            <VndAmountInput
              id="goal-amount"
              defaultRaw={editing ? String(editing.targetAmount) : ""}
              aria-label="Số tiền mục tiêu"
              onValueChange={setAmount}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-date">Hạn (tùy chọn)</Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tài khoản liên kết (tùy chọn)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>Không liên kết</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
