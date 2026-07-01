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
import { DateInput } from "@/components/ui/date-input";
import { toIctDateInput } from "@/lib/locale";
import { RANGE_PRESETS, type RangePreset } from "../date-range";
import { FilterChip } from "./filter-chip";
import { FilterSegmented } from "./filter-segmented";

const KIND_OPTIONS = ["all", "income", "expense", "transfer"] as const;

const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "last-month": "Tháng trước",
  custom: "Tùy chỉnh",
};

const KIND_LABELS: Record<(typeof KIND_OPTIONS)[number], string> = {
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

  // Selecting "Tùy chỉnh" seeds the range to the current month (1st → today) so
  // the date inputs open populated instead of blank; existing custom bounds are
  // preserved when re-selecting.
  function selectRange(p: RangePreset) {
    if (p === "custom") {
      const today = toIctDateInput(new Date());
      setParams({
        range: "custom",
        from: sp.get("from") ?? `${today.slice(0, 8)}01`,
        to: sp.get("to") ?? today,
      });
      return;
    }
    setParams({ range: p === "month" ? null : p });
  }

  function clearFilters() {
    setParams({ range: null, kind: null, accountId: null, categoryId: null, from: null, to: null });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Date-range presets scroll horizontally when they overflow. The scrollbar
          is hidden and a right-edge gradient over the screen bleed signals the
          row continues, so a clipped last preset reads as "more →" instead of a
          broken label. */}
      <div className="relative -mx-4">
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGE_PRESETS.map((p) => (
            <FilterChip key={p} active={range === p} onClick={() => selectRange(p)}>
              {RANGE_LABELS[p]}
            </FilterChip>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
          aria-hidden="true"
        />
      </div>

      {range === "custom" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <DateInput
              aria-label="Từ ngày"
              clearLabel="Xóa từ ngày"
              value={sp.get("from") ?? ""}
              onValueChange={(v) => setParams({ from: v || null })}
            />
          </div>
          <div className="flex-1">
            <DateInput
              aria-label="Đến ngày"
              clearLabel="Xóa đến ngày"
              value={sp.get("to") ?? ""}
              onValueChange={(v) => setParams({ to: v || null })}
            />
          </div>
        </div>
      )}

      {/* One shared filter row: the kind segmented control on the left, account +
          category selects on the right. On a phone the segmented control spans
          full width and the selects wrap to their own line (control + two
          dropdowns can't legibly share ~360px); from sm up all three sit on one
          row with the selects flexing to fill the space past the control. */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSegmented
          ariaLabel="Lọc theo loại"
          value={kind}
          onChange={(k) => setParams({ kind: k === "all" ? null : k })}
          options={KIND_OPTIONS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
        />

        <div className="flex basis-full gap-2 sm:basis-auto sm:flex-1">
          <div className="min-w-0 flex-1">
            <Select
              value={accountId}
              onValueChange={(v) => setParams({ accountId: v === "all" ? null : v })}
            >
              <SelectTrigger
                aria-label="Lọc theo tài khoản"
                className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"
              >
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
          </div>

          {categoryOptions.length > 0 && (
            <div className="min-w-0 flex-1">
              <Select
                value={categoryId}
                onValueChange={(v) => setParams({ categoryId: v === "all" ? null : v })}
              >
                <SelectTrigger
                  aria-label="Lọc theo danh mục"
                  className="min-w-0 [&>span]:min-w-0 [&>span]:truncate"
                >
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
            </div>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X size={14} aria-hidden="true" /> Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
