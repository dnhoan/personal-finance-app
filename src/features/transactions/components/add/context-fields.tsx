"use client";
import * as React from "react";
import { Controller, type Control } from "react-hook-form";
import { Wallet, ArrowDownToLine, Tag, Target, CalendarDays, StickyNote } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CategoryPicker,
  type CategoryPickerOption,
} from "@/features/categories/components/category-picker";
import { GoalPicker, type GoalPickerOption } from "@/features/goals/components/goal-picker";
import type { AccountOption } from "../../lib/quick-add-form";
import type { TxKind } from "../kind-toggle";
import type { AddFormValues } from "./add-form-values";

// Compact context block below the amount hero: account, category (or transfer
// destination), optional goal, date, and an optional note. Defaults arrive
// pre-selected, so most adds never touch this — it stays glanceable and reserves
// the lower half of the screen for the keypad.

function FieldLabel({ icon: Icon, children }: { icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1.5 text-xs text-fg-muted">
      <Icon size={14} aria-hidden="true" className="text-fg-subtle" />
      {children}
    </Label>
  );
}

export function ContextFields({
  control,
  accounts,
  categories,
  goals,
  kind,
}: {
  control: Control<AddFormValues>;
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  goals: GoalPickerOption[];
  kind: TxKind;
}) {
  const isTransfer = kind === "transfer";
  const [showNote, setShowNote] = React.useState(false);

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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Wallet}>{isTransfer ? "Từ tài khoản" : "Tài khoản"}</FieldLabel>
          {accountSelect("accountId", "Chọn tài khoản")}
        </div>

        {isTransfer ? (
          <div className="flex flex-col gap-1">
            <FieldLabel icon={ArrowDownToLine}>Đến tài khoản</FieldLabel>
            {accountSelect("toAccountId", "Chọn tài khoản")}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <FieldLabel icon={Tag}>Danh mục</FieldLabel>
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel icon={CalendarDays}>Ngày</FieldLabel>
          <Controller
            control={control}
            name="occurredAt"
            render={({ field }) => (
              <DateInput clearable={false} value={field.value} onValueChange={field.onChange} />
            )}
          />
        </div>

        {!isTransfer && goals.length > 0 && (
          <div className="flex flex-col gap-1">
            <FieldLabel icon={Target}>Mục tiêu</FieldLabel>
            <Controller
              control={control}
              name="goalId"
              render={({ field }) => (
                <GoalPicker goals={goals} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        )}
      </div>

      <Controller
        control={control}
        name="note"
        render={({ field }) =>
          showNote || field.value ? (
            <div className="flex flex-col gap-1">
              <FieldLabel icon={StickyNote}>Ghi chú</FieldLabel>
              <Input
                {...field}
                autoFocus={showNote && !field.value}
                placeholder="Tùy chọn…"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="flex w-fit items-center gap-1.5 text-sm text-fg-muted transition-colors active:text-fg"
            >
              <StickyNote size={15} aria-hidden="true" className="text-fg-subtle" />
              Thêm ghi chú
            </button>
          )
        }
      />
    </div>
  );
}
