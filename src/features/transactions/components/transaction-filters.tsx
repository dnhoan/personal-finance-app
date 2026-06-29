"use client";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RANGE_PRESETS, type RangePreset } from "../date-range";
import { FilterChip } from "./filter-chip";

const KIND_OPTIONS = ["all", "income", "expense", "transfer"] as const;

const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "last-month": "Tháng trước",
  custom: "Tùy chỉnh",
};

const KIND_LABELS: Record<string, string> = {
  all: "Tất cả",
  income: "Thu",
  expense: "Chi",
  transfer: "Chuyển",
};

type CategoryFilterOption = { id: string; name: string; parentId: string | null };

// Orders categories as roots followed by their indented children, so the select
// reads as a shallow tree.
function orderCategories(categories: CategoryFilterOption[]): { id: string; label: string }[] {
  const roots = categories.filter((c) => c.parentId === null);
  const childrenByParent = new Map<string, CategoryFilterOption[]>();
  for (const c of categories) {
    if (c.parentId === null) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }
  return roots.flatMap((root) => [
    { id: root.id, label: root.name },
    ...(childrenByParent.get(root.id) ?? []).map((c) => ({ id: c.id, label: `   ${c.name}` })),
  ]);
}

// Filter bar wired to URL search params so the server page re-queries on change.
export function TransactionFilters({
  accounts,
  categories,
}: {
  accounts: { id: string; name: string }[];
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const range = (sp.get("range") as RangePreset) || "month";
  const kind = sp.get("kind") || "all";
  const accountId = sp.get("accountId") || "all";
  const categoryId = sp.get("categoryId") || "all";
  const categoryOptions = orderCategories(categories);

  // Any filter differing from the default month-only view.
  const hasActiveFilters =
    range !== "month" || kind !== "all" || accountId !== "all" || categoryId !== "all";

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.replace(`${pathname}?${params.toString()}` as Route);
  }

  function clearFilters() {
    setParams({ range: null, kind: null, accountId: null, categoryId: null, from: null, to: null });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1">
        {RANGE_PRESETS.map((p) => (
          <FilterChip
            key={p}
            active={range === p}
            onClick={() => setParams({ range: p === "month" ? null : p })}
          >
            {RANGE_LABELS[p]}
          </FilterChip>
        ))}
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1">
        {KIND_OPTIONS.map((k) => (
          <FilterChip
            key={k}
            active={kind === k}
            ariaLabel={`Lọc theo loại: ${KIND_LABELS[k]}`}
            onClick={() => setParams({ kind: k === "all" ? null : k })}
          >
            {KIND_LABELS[k]}
          </FilterChip>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X size={14} aria-hidden="true" /> Xóa bộ lọc
          </button>
        )}
      </div>

      {range === "custom" && (
        <div className="flex gap-2">
          <Input
            type="date"
            aria-label="Từ ngày"
            defaultValue={sp.get("from") ?? ""}
            onChange={(e) => setParams({ from: e.target.value || null })}
          />
          <Input
            type="date"
            aria-label="Đến ngày"
            defaultValue={sp.get("to") ?? ""}
            onChange={(e) => setParams({ to: e.target.value || null })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={accountId}
          onValueChange={(v) => setParams({ accountId: v === "all" ? null : v })}
        >
          <SelectTrigger aria-label="Lọc theo tài khoản">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi tài khoản</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categoryOptions.length > 0 && (
          <Select
            value={categoryId}
            onValueChange={(v) => setParams({ categoryId: v === "all" ? null : v })}
          >
            <SelectTrigger aria-label="Lọc theo danh mục">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi danh mục</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
