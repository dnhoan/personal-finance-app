"use client";
import { Label } from "@/components/ui/label";
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
import type { TxKind } from "./kind-toggle";

type Option = { id: string; name: string };

function AccountSelectField({
  id,
  label,
  value,
  onChange,
  options,
  locked,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  locked: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={locked}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Chọn tài khoản" />
        </SelectTrigger>
        <SelectContent>
          {options.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {locked && (
        <p className="text-xs text-fg-muted">Giao dịch đồng bộ ngân hàng giữ tài khoản gốc</p>
      )}
    </div>
  );
}

// Kind-dependent part of the edit sheet: income/expense show one account + a
// category (filtered by kind); a transfer shows source + destination accounts.
// Pure presentation — the sheet owns state, prefill and locking rules.
export function TransactionEditFields({
  kind,
  accountOptions,
  categories,
  accountId,
  onAccountChange,
  accountLocked,
  categoryId,
  onCategoryChange,
  fromId,
  onFromChange,
  toId,
  onToChange,
  lockedSide,
}: {
  kind: TxKind;
  accountOptions: Option[];
  categories: CategoryPickerOption[];
  accountId: string;
  onAccountChange: (id: string) => void;
  accountLocked: boolean;
  categoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  fromId: string;
  onFromChange: (id: string) => void;
  toId: string;
  onToChange: (id: string) => void;
  /** Transfer side pinned to a bank-synced row's account. */
  lockedSide: "from" | "to" | null;
}) {
  if (kind === "transfer") {
    return (
      <>
        <AccountSelectField
          id="edit-from"
          label="Từ tài khoản"
          value={fromId}
          onChange={onFromChange}
          options={accountOptions}
          locked={lockedSide === "from"}
        />
        <AccountSelectField
          id="edit-to"
          label="Đến tài khoản"
          value={toId}
          onChange={onToChange}
          options={accountOptions}
          locked={lockedSide === "to"}
        />
      </>
    );
  }

  return (
    <>
      <AccountSelectField
        id="edit-account"
        label="Tài khoản"
        value={accountId}
        onChange={onAccountChange}
        options={accountOptions}
        locked={accountLocked}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>Danh mục</Label>
        <CategoryPicker
          categories={categories}
          kind={kind}
          value={categoryId}
          onChange={onCategoryChange}
        />
      </div>
    </>
  );
}
