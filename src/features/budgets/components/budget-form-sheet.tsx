"use client";
import * as React from "react";
import { Trash2, Check, PiggyBank } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VndAmountInput } from "@/components/forms/vnd-amount-input";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { cn } from "@/lib/utils";
import { upsertBudget, deleteBudget } from "../actions";
import type { BudgetRowData, BudgetableCategory } from "../queries";

export type BudgetEditTarget = Pick<
  BudgetRowData,
  "categoryId" | "name" | "parentName" | "amount" | "rollover" | "icon" | "color"
> | null;

const FALLBACK_COLOR = "#64748B";

// Common monthly limits, in whole VND. Tapping seeds the amount field — most
// budgets land on a round figure, so this saves typing on mobile.
const AMOUNT_PRESETS: { label: string; value: number }[] = [
  { label: "500k", value: 500_000 },
  { label: "1tr", value: 1_000_000 },
  { label: "2tr", value: 2_000_000 },
  { label: "3tr", value: 3_000_000 },
  { label: "5tr", value: 5_000_000 },
];

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

  // Seed text + remount key let preset chips drive the amount field without
  // making the shared VndAmountInput a controlled component.
  const [amountSeed, setAmountSeed] = React.useState("");
  const [amountKey, setAmountKey] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setCategoryId(editing?.categoryId ?? "");
      setAmount(editing?.amount ?? null);
      setRollover(editing?.rollover ?? false);
      setAmountSeed(editing ? String(editing.amount) : "");
      setAmountKey((k) => k + 1);
      setError(null);
    }
  }, [open, editing]);

  function applyPreset(value: number) {
    setAmount(value);
    setAmountSeed(String(value));
    setAmountKey((k) => k + 1);
  }

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

  const noCategories = !isEdit && budgetableCategories.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={isEdit ? "Sửa hạn mức" : "Thêm hạn mức"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Category — a static colored chip when editing, a visual picker when
              adding. The picker mirrors the budget rows' colored icon tiles. */}
          <div className="flex flex-col gap-2">
            <Label>Danh mục</Label>
            {isEdit ? (
              <CategoryChip
                name={editing.name}
                parentName={editing.parentName}
                icon={editing.icon}
                color={editing.color}
              />
            ) : noCategories ? (
              <p className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-4 text-center text-sm text-fg-subtle">
                Mọi danh mục chi tiêu đã có hạn mức tháng này.
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-label="Chọn danh mục"
                className="grid max-h-[38vh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-0.5"
              >
                {budgetableCategories.map((c) => (
                  <CategoryTile
                    key={c.id}
                    category={c}
                    selected={categoryId === c.id}
                    onSelect={() => setCategoryId(c.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Amount with quick-pick presets. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-amount">Hạn mức mỗi tháng</Label>
            <VndAmountInput
              key={amountKey}
              id="budget-amount"
              defaultRaw={amountSeed}
              aria-label="Hạn mức"
              onValueChange={setAmount}
            />
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((p) => {
                const active = amount === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => applyPreset(p.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]",
                      active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface text-fg-muted hover:bg-surface-muted",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rollover — now explained, not just a bare toggle. */}
          <button
            type="button"
            role="switch"
            aria-checked={rollover}
            onClick={() => setRollover((v) => !v)}
            className="flex items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                rollover ? "bg-accent/15 text-accent" : "bg-surface-muted text-fg-muted",
              )}
            >
              <PiggyBank size={18} strokeWidth={1.85} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">
                Chuyển số dư sang tháng sau
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-fg-subtle">
                Phần chưa tiêu của tháng này sẽ cộng vào hạn mức tháng kế tiếp.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
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
            <Button type="submit" disabled={submitting || noCategories} className="h-12 flex-1">
              {submitting ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Static colored category chip (edit mode), echoing the picker tiles.
function CategoryChip({
  name,
  parentName,
  icon,
  color,
}: {
  name: string;
  parentName: string | null;
  icon: string | null;
  color: string | null;
}) {
  const Icon = getCategoryIcon(icon);
  const c = color ?? FALLBACK_COLOR;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${c}1A`, color: c }}
      >
        <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        {parentName && (
          <span className="block truncate text-[11px] text-fg-subtle">{parentName}</span>
        )}
        <span className="block truncate text-sm font-semibold text-fg">{name}</span>
      </span>
    </div>
  );
}

// One selectable category in the add-mode picker grid.
function CategoryTile({
  category,
  selected,
  onSelect,
}: {
  category: BudgetableCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = getCategoryIcon(category.icon);
  const c = category.color ?? FALLBACK_COLOR;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]",
        selected
          ? "border-accent bg-accent/10 ring-1 ring-accent"
          : "border-border bg-surface hover:bg-surface-muted",
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${c}1A`, color: c }}
      >
        <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        {category.parentName && (
          <span className="block truncate text-[11px] text-fg-subtle">{category.parentName}</span>
        )}
        <span className="block truncate text-sm font-medium text-fg">{category.name}</span>
      </span>
      {selected && <Check size={16} className="shrink-0 text-accent" aria-hidden="true" />}
    </button>
  );
}
