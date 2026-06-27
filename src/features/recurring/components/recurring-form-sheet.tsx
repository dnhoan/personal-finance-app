"use client";
import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Pause, Play, Trash2 } from "lucide-react";
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
import {
  CategoryPicker,
  type CategoryPickerOption,
} from "@/features/categories/components/category-picker";
import { cn } from "@/lib/utils";
import { createRule, updateRule, deleteRule, pauseRule } from "../actions";
import { isValidRrule } from "../lib/rrule-builder";
import { RruleBuilderFields } from "./rrule-builder-fields";
import type { RecurringRuleItem } from "../queries";

export type AccountOption = { id: string; name: string };

const KIND_OPTS = [
  { value: "expense" as const, label: "Chi", icon: ArrowUpRight, active: "text-expense" },
  { value: "income" as const, label: "Thu", icon: ArrowDownLeft, active: "text-income" },
];

// Add or edit a recurring rule. The recurrence pattern is delegated to
// RruleBuilderFields; this sheet owns the account / kind / amount / category /
// note / lead-days fields. Editing here is "edit series" (mutates the rule going
// forward; past materialised rows untouched).
export function RecurringFormSheet({
  open,
  onOpenChange,
  accounts,
  categories,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  editing: RecurringRuleItem | null;
}) {
  const isEdit = editing !== null;
  const [kind, setKind] = React.useState<"income" | "expense">("expense");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [accountId, setAccountId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [leadDays, setLeadDays] = React.useState(3);
  const [rrule, setRrule] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setKind(editing?.kind ?? "expense");
      setAmount(editing?.amount ?? null);
      setAccountId(editing?.accountId ?? "");
      setCategoryId(editing?.categoryId ?? null);
      setNote(editing?.note ?? "");
      setLeadDays(editing?.leadDays ?? 3);
      setRrule(editing?.rrule ?? "");
      setError(null);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amount === null || amount <= 0) return setError("Nhập số tiền hợp lệ");
    if (!accountId) return setError("Chọn tài khoản");
    if (!rrule || !isValidRrule(rrule)) return setError("Cấu hình lịch lặp hợp lệ");
    setSubmitting(true);
    try {
      const payload = { accountId, categoryId, kind, amount, note, rrule, leadDays };
      if (editing) await updateRule({ id: editing.id, ...payload });
      else await createRule(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePause() {
    if (!editing) return;
    setSubmitting(true);
    try {
      await pauseRule({ id: editing.id, active: !editing.active });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm("Xóa quy tắc này? Các giao dịch đã tạo vẫn được giữ lại.")) return;
    setSubmitting(true);
    try {
      await deleteRule({ id: editing.id });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={isEdit ? "Sửa quy tắc định kỳ" : "Quy tắc định kỳ mới"}>
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
                onClick={() => {
                  setKind(value);
                  setCategoryId(null); // category options are kind-specific
                }}
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
            <Label htmlFor="rule-amount">Số tiền</Label>
            <VndAmountInput
              id="rule-amount"
              defaultRaw={editing ? String(editing.amount) : ""}
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
            <Label>Danh mục</Label>
            <CategoryPicker
              categories={categories}
              kind={kind}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>

          <RruleBuilderFields
            key={`${editing?.id ?? "new"}:${open}`}
            initialRrule={editing?.rrule}
            onChange={setRrule}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-note">Ghi chú</Label>
            <Input
              id="rule-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Vd: Netflix Premium…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="rule-lead">Nhắc trước (ngày)</Label>
            <Input
              id="rule-lead"
              type="number"
              min={0}
              max={30}
              inputMode="numeric"
              value={leadDays}
              onChange={(e) => setLeadDays(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
              className="w-20"
            />
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePause}
              disabled={submitting}
              className="h-11 w-full gap-2"
            >
              {editing.active ? (
                <>
                  <Pause size={16} aria-hidden="true" /> Tạm dừng quy tắc
                </>
              ) : (
                <>
                  <Play size={16} aria-hidden="true" /> Kích hoạt lại
                </>
              )}
            </Button>
          )}

          <div className="flex gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={submitting}
                className="h-12 text-expense"
                aria-label="Xóa quy tắc"
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
