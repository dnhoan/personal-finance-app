"use client";
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
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
import { GoalPicker, type GoalPickerOption } from "@/features/goals/components/goal-picker";
import { KindToggle, type TxKind } from "./kind-toggle";
import { createTransaction, createTransfer } from "../actions";

export type AccountOption = { id: string; name: string };

type FormValues = {
  kind: TxKind;
  amount: number | null;
  accountId: string;
  toAccountId: string;
  categoryId: string | null;
  goalId: string | null;
  note: string;
};

// Bottom-sheet quick-add. One submit creates an income/expense row, or — in
// transfer mode — an atomic linked pair. A fresh clientOpId is minted each open
// so a retry/double-tap is idempotent server-side. Category is a slot (Phase 5).
export function QuickAddSheet({
  accounts,
  categories,
  goals = [],
  open,
  onOpenChange,
  defaultAccountId,
  defaultKind,
}: {
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  goals?: GoalPickerOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select this account (the "from" account in transfer mode). */
  defaultAccountId?: string;
  /** Pre-select the transaction kind on open. */
  defaultKind?: TxKind;
}) {
  const clientOpId = React.useRef("");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const { control, register, handleSubmit, watch, reset, setValue, formState } =
    useForm<FormValues>({
      defaultValues: {
        kind: defaultKind ?? "expense",
        amount: null,
        accountId: defaultAccountId ?? "",
        toAccountId: "",
        categoryId: null,
        goalId: null,
        note: "",
      },
    });
  const kind = watch("kind");
  const isTransfer = kind === "transfer";

  React.useEffect(() => {
    if (open) {
      clientOpId.current = crypto.randomUUID();
      setSubmitError(null);
      // Re-seed each open so the pills' chosen account/kind take effect even when
      // the sheet was previously opened with different defaults.
      reset({
        kind: defaultKind ?? "expense",
        amount: null,
        accountId: defaultAccountId ?? "",
        toAccountId: "",
        categoryId: null,
        goalId: null,
        note: "",
      });
    }
  }, [open, defaultAccountId, defaultKind, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (values.amount === null || values.amount <= 0) {
      // Amount is the most common failure — pull focus back to it. The input is a
      // controlled custom field, so target its DOM node by id rather than RHF's
      // setFocus (which only tracks ref-registered inputs).
      document.getElementById("qa-amount")?.focus();
      return setSubmitError("Nhập số tiền hợp lệ");
    }
    if (!values.accountId) return setSubmitError("Chọn tài khoản");
    try {
      if (isTransfer) {
        if (!values.toAccountId) return setSubmitError("Chọn tài khoản đích");
        if (values.accountId === values.toAccountId)
          return setSubmitError("Tài khoản nguồn và đích phải khác nhau");
        await createTransfer({
          fromAccountId: values.accountId,
          toAccountId: values.toAccountId,
          amount: values.amount,
          occurredAt: new Date(),
          note: values.note,
          clientOpId: clientOpId.current,
        });
      } else {
        await createTransaction({
          kind,
          amount: values.amount,
          accountId: values.accountId,
          categoryId: values.categoryId,
          goalId: values.goalId,
          occurredAt: new Date(),
          note: values.note,
          clientOpId: clientOpId.current,
        });
      }
      reset({
        kind,
        amount: null,
        accountId: values.accountId,
        toAccountId: "",
        categoryId: null,
        goalId: null,
        note: "",
      });
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    }
  }

  // Guard against silently discarding a half-filled form. Only fires when the
  // form is actually dirty, so the common open→close-empty path stays friction-
  // free. The discard toast lets the user confirm rather than blocking outright.
  function requestClose(next: boolean) {
    if (next) return onOpenChange(true);
    if (!formState.isDirty) return onOpenChange(false);
    toast("Bỏ thay đổi chưa lưu?", {
      action: { label: "Bỏ", onClick: () => onOpenChange(false) },
    });
  }

  const accountSelect = (name: "accountId" | "toAccountId", placeholder: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent title="Thêm giao dịch">
        {accounts.length === 0 ? (
          <div className="flex flex-col gap-3 py-4 text-center">
            <p className="text-fg-muted">Bạn cần tạo tài khoản trước khi ghi giao dịch.</p>
            <Button asChild className="h-12">
              <Link href={"/accounts" as Route}>Tạo tài khoản</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <KindToggle
                  value={field.value}
                  onChange={(k) => {
                    field.onChange(k);
                    // Category options are kind-specific; clear on switch.
                    setValue("categoryId", null);
                  }}
                />
              )}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qa-amount">Số tiền</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <VndAmountInput
                    id="qa-amount"
                    aria-label="Số tiền"
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{isTransfer ? "Từ tài khoản" : "Tài khoản"}</Label>
              {accountSelect("accountId", "Chọn tài khoản")}
            </div>

            {isTransfer ? (
              <div className="flex flex-col gap-1.5">
                <Label>Đến tài khoản</Label>
                {accountSelect("toAccountId", "Chọn tài khoản")}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>Danh mục</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <CategoryPicker
                      categories={categories}
                      kind={kind as "income" | "expense"}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}

            {!isTransfer && goals.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Gắn mục tiêu (tùy chọn)</Label>
                <Controller
                  control={control}
                  name="goalId"
                  render={({ field }) => (
                    <GoalPicker goals={goals} value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qa-note">Ghi chú</Label>
              <Input
                id="qa-note"
                {...register("note")}
                placeholder="Tùy chọn…"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {submitError && (
              <p className="text-sm text-expense" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={formState.isSubmitting} className="h-12 w-full">
              {formState.isSubmitting ? "Đang lưu…" : "Lưu giao dịch"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
