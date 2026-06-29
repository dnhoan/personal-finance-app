"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { VndAmountInput } from "@/components/forms/vnd-amount-input";
import { cn } from "@/lib/utils";
import { upsertBudget, deleteBudget } from "../actions";
import type { BudgetRowData, BudgetableCategory } from "../queries";

export type BudgetEditTarget = Pick<
  BudgetRowData,
  "categoryId" | "name" | "parentName" | "amount" | "rollover"
> | null;

// Add a budget (pick a not-yet-budgeted category) or edit an existing one
// (category fixed; amount + rollover editable; delete available).
export function BudgetFormSheet({
  open,
  onOpenChange,
  periodMonth,
  editing,
  budgetableCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Month-start "YYYY-MM-01". */
  periodMonth: string;
  editing: BudgetEditTarget;
  budgetableCategories: BudgetableCategory[];
}) {
  const isEdit = editing !== null;
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [rollover, setRollover] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCategoryId(editing?.categoryId ?? "");
      setAmount(editing?.amount ?? null);
      setRollover(editing?.rollover ?? false);
      setError(null);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) return setError("Chọn danh mục");
    if (amount === null || amount <= 0) return setError("Nhập hạn mức hợp lệ");
    setSubmitting(true);
    try {
      await upsertBudget({ categoryId, periodMonth, amount, rollover });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm("Xóa hạn mức này?")) return;
    setSubmitting(true);
    try {
      await deleteBudget({ categoryId: editing.categoryId, periodMonth });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={isEdit ? "Sửa hạn mức" : "Thêm hạn mức"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Danh mục</Label>
            {isEdit ? (
              <p className="rounded-md border border-border bg-surface-muted px-3 py-2.5 text-sm font-medium">
                {editing.parentName ? `${editing.parentName} / ${editing.name}` : editing.name}
              </p>
            ) : budgetableCategories.length === 0 ? (
              <p className="text-sm text-fg-subtle">Mọi danh mục chi tiêu đã có hạn mức.</p>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {budgetableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parentName ? `${c.parentName} / ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-amount">Hạn mức / tháng</Label>
            <VndAmountInput
              id="budget-amount"
              defaultRaw={editing ? String(editing.amount) : ""}
              aria-label="Hạn mức"
              onValueChange={setAmount}
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={rollover}
            onClick={() => setRollover((v) => !v)}
            className="flex items-center justify-between rounded-md border border-border p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-sm font-medium text-fg">Chuyển số dư sang tháng sau</span>
            <span
              aria-hidden="true"
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                rollover ? "bg-accent" : "bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                  rollover ? "left-[18px]" : "left-0.5",
                )}
              />
            </span>
          </button>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={submitting}
                className="h-12 text-expense"
                aria-label="Xóa hạn mức"
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            )}
            <Button type="submit" disabled={submitting} className="h-12 flex-1">
              {submitting ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
