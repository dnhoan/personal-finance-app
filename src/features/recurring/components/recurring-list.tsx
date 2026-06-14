"use client";
import * as React from "react";
import { Plus, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/back-link";
import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import { RecurringRow } from "./recurring-row";
import { RecurringFormSheet, type AccountOption } from "./recurring-form-sheet";
import type { RecurringRuleItem } from "../queries";

type Filter = "active" | "paused" | "all";

// Client shell: segmented active/paused/all filter, rule cards, the add button,
// and the add/edit form sheet. `initialEditId` opens a rule's sheet on load — the
// landing target for the transactions-list "edit series" deep link.
export function RecurringList({
  rules,
  accounts,
  categories,
  initialEditId,
  children,
}: {
  rules: RecurringRuleItem[];
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  initialEditId?: string;
  children?: React.ReactNode;
}) {
  const [filter, setFilter] = React.useState<Filter>("active");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringRuleItem | null>(null);

  const activeCount = rules.filter((r) => r.active).length;
  const pausedCount = rules.length - activeCount;

  const openEdit = React.useCallback((rule: RecurringRuleItem) => {
    setEditing(rule);
    setOpen(true);
  }, []);

  // Honour the ?edit=<ruleId> deep link once on mount.
  const handledDeepLink = React.useRef(false);
  React.useEffect(() => {
    if (handledDeepLink.current || !initialEditId) return;
    handledDeepLink.current = true;
    const target = rules.find((r) => r.id === initialEditId);
    if (target) openEdit(target);
  }, [initialEditId, rules, openEdit]);

  const visible = rules.filter((r) =>
    filter === "all" ? true : filter === "active" ? r.active : !r.active,
  );

  const TABS: { value: Filter; label: string }[] = [
    { value: "active", label: `Đang hoạt động · ${activeCount}` },
    { value: "paused", label: `Tạm dừng · ${pausedCount}` },
    { value: "all", label: "Tất cả" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        href="/settings"
        label="Định kỳ"
        action={
          <Button
            size="icon"
            className="rounded-full"
            aria-label="Tạo quy tắc định kỳ mới"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={20} aria-hidden="true" />
          </Button>
        }
      />

      {children}

      <div className="flex gap-1 self-start rounded-full bg-surface-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={filter === t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
              filter === t.value ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <CalendarClock size={32} className="text-fg-subtle" aria-hidden="true" />
          <p className="text-fg-muted">Chưa có quy tắc định kỳ nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((rule) => (
            <RecurringRow key={rule.id} rule={rule} onEdit={openEdit} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted"
      >
        <Plus size={16} aria-hidden="true" /> Tạo quy tắc định kỳ mới
      </button>

      <RecurringFormSheet
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        categories={categories}
        editing={editing}
      />
    </div>
  );
}
