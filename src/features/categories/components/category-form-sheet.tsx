"use client";
import * as React from "react";
import { Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ICON_NAMES, CATEGORY_COLORS, getCategoryIcon } from "../category-icons";
import { createCategory, updateCategory } from "../actions";
import type { CategoryKind } from "../queries";

export type CategoryEditTarget = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
} | null;

export type RootOption = { id: string; name: string; kind: CategoryKind };

// Create (name + kind + parent + icon + color) or edit (name + icon + color).
// Kind and parent are fixed once created. Choosing a parent forces the new
// category's kind to the parent's kind (depth cap = 2 means parents are roots).
export function CategoryFormSheet({
  open,
  onOpenChange,
  editing,
  roots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CategoryEditTarget;
  roots: RootOption[];
}) {
  const isEdit = editing !== null;
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<CategoryKind>("expense");
  const [parentId, setParentId] = React.useState<string>("none");
  const [icon, setIcon] = React.useState<string>(ICON_NAMES[0]!);
  const [color, setColor] = React.useState<string>(CATEGORY_COLORS[0]!);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setKind("expense");
      setParentId("none");
      setIcon(editing?.icon ?? ICON_NAMES[0]!);
      setColor(editing?.color ?? CATEGORY_COLORS[0]!);
      setError(null);
    }
  }, [open, editing]);

  // Parent options follow the chosen kind; selecting a parent pins the kind.
  const parentOptions = roots.filter((r) => r.kind === kind);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Nhập tên danh mục");
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCategory({ id: editing.id, name: name.trim(), icon, color });
      } else {
        await createCategory({
          name: name.trim(),
          kind,
          parentId: parentId === "none" ? null : parentId,
          icon,
          color,
        });
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
      <SheetContent title={isEdit ? "Sửa danh mục" : "Thêm danh mục"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Live identity preview — the chosen icon + color update here as the
              user builds the category, so they see how it will appear in lists. */}
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors"
              style={{
                backgroundColor: `${color}1A`,
                color,
                boxShadow: `inset 0 0 0 1px ${color}33`,
              }}
            >
              {React.createElement(getCategoryIcon(icon), { size: 26, "aria-hidden": true })}
            </span>
            <Input
              aria-label="Tên danh mục"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Đi chợ, Cà phê…"
              autoComplete="off"
              spellCheck={false}
              className="text-base font-medium"
            />
          </div>

          {!isEdit && (
            <>
              <div
                role="radiogroup"
                aria-label="Loại"
                className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
              >
                {(["expense", "income"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => {
                      setKind(k);
                      setParentId("none");
                    }}
                    className={cn(
                      "flex min-h-[42px] items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                      kind === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          k === "expense" ? "var(--color-expense)" : "var(--color-income)",
                      }}
                    />
                    {k === "expense" ? "Chi tiêu" : "Thu nhập"}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Thuộc danh mục</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không (danh mục gốc)</SelectItem>
                    {parentOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label>Biểu tượng</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_NAMES.map((nm) => {
                const Icon = getCategoryIcon(nm);
                const selected = icon === nm;
                return (
                  <button
                    key={nm}
                    type="button"
                    aria-label={nm}
                    aria-pressed={selected}
                    onClick={() => setIcon(nm)}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-lg border transition-transform touch-manipulation [-webkit-tap-highlight-color:transparent]",
                      selected
                        ? "scale-105"
                        : "border-border text-fg-muted hover:bg-surface-muted active:scale-90",
                    )}
                    // Selected icon adopts the chosen color so the two pickers
                    // read as one decision.
                    style={
                      selected
                        ? { backgroundColor: `${color}1A`, color, borderColor: color }
                        : undefined
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Màu</Label>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORY_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Màu ${c}`}
                    aria-pressed={selected}
                    onClick={() => setColor(c)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-transform touch-manipulation [-webkit-tap-highlight-color:transparent]",
                      selected ? "scale-110" : "hover:scale-105 active:scale-90",
                    )}
                    style={{
                      backgroundColor: c,
                      boxShadow: selected
                        ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${c}`
                        : undefined,
                    }}
                  >
                    {selected && <Check size={16} className="text-white" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
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
