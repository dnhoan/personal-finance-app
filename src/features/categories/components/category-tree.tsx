"use client";
import * as React from "react";
import { Plus, MoreVertical, Pencil, Archive, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/back-link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "../category-icons";
import { archiveCategory } from "../actions";
import type { CategoryNode, CategoryChild, CategoryKind } from "../queries";
import { CategoryFormSheet, type CategoryEditTarget, type RootOption } from "./category-form-sheet";

// /settings/categories manager: Chi tiêu/Thu nhập tabs (both trees fetched
// server-side, toggled client-side), per-category month spend, add/edit/archive.
export function CategoryTree({
  expenseTree,
  incomeTree,
  totalExpense,
}: {
  expenseTree: CategoryNode[];
  incomeTree: CategoryNode[];
  totalExpense: number;
}) {
  const [kind, setKind] = React.useState<CategoryKind>("expense");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryEditTarget>(null);

  const tree = kind === "expense" ? expenseTree : incomeTree;
  const roots: RootOption[] = [...expenseTree, ...incomeTree].map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
  }));
  const childCount = tree.reduce((n, r) => n + r.children.length, 0);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(c: { id: string; name: string; icon: string | null; color: string | null }) {
    setEditing({ id: c.id, name: c.name, icon: c.icon, color: c.color });
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        href="/settings"
        label="Danh mục"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" /> Thêm
          </Button>
        }
      />

      <div
        role="radiogroup"
        aria-label="Loại danh mục"
        className="inline-flex gap-1 self-start rounded-full bg-surface-muted p-1"
      >
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
              kind === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {k === "expense" ? "Chi tiêu" : "Thu nhập"}
          </button>
        ))}
      </div>

      {kind === "expense" && (
        <p className="text-[12px] text-fg-muted">
          {tree.length} danh mục · {childCount} danh mục con · Đã chi{" "}
          <span className="font-semibold tabular-nums text-expense">{formatVnd(totalExpense)}</span>
        </p>
      )}

      {tree.length === 0 ? (
        <p className="py-12 text-center text-fg-muted">Chưa có danh mục nào.</p>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {tree.map((root) => (
            <div key={root.id}>
              <CategoryRow node={root} onEdit={openEdit} />
              {root.children.map((child) => (
                <ChildRow key={child.id} child={child} onEdit={openEdit} />
              ))}
            </div>
          ))}
        </Card>
      )}

      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        roots={roots}
      />
    </div>
  );
}

function CategoryRow({ node, onEdit }: { node: CategoryNode; onEdit: (c: CategoryNode) => void }) {
  const Icon = getCategoryIcon(node.icon);
  const color = node.color ?? "#64748B";
  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">
          {node.name}
          {node.children.length > 0 && (
            <span className="ml-1 text-[11px] font-normal text-fg-subtle">
              · {node.children.length} danh mục con
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatVnd(node.spent)}</span>
      <CategoryMenu id={node.id} onEdit={() => onEdit(node)} />
    </div>
  );
}

function ChildRow({ child, onEdit }: { child: CategoryChild; onEdit: (c: CategoryChild) => void }) {
  return (
    <div className="flex items-center gap-2 py-3 pl-12 pr-4">
      <CornerDownRight size={14} className="shrink-0 text-fg-subtle" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[13px] text-fg">{child.name}</p>
      <span className="shrink-0 text-[13px] tabular-nums">{formatVnd(child.spent)}</span>
      <CategoryMenu id={child.id} onEdit={() => onEdit(child)} />
    </div>
  );
}

function CategoryMenu({ id, onEdit }: { id: string; onEdit: () => void }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tùy chọn danh mục"
        className="flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit()}>
          <Pencil size={16} aria-hidden="true" /> Sửa
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            if (window.confirm("Lưu trữ danh mục này? Giao dịch cũ vẫn được giữ lại."))
              startTransition(() => void archiveCategory({ id }));
          }}
        >
          <Archive size={16} aria-hidden="true" /> Lưu trữ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
