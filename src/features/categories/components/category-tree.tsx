"use client";
import * as React from "react";
import { Plus, MoreVertical, Pencil, Archive, CornerDownRight, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { archiveCategory, reorderCategories } from "../actions";
import type { CategoryNode, CategoryChild, CategoryKind } from "../queries";
import { CategoryFormSheet, type CategoryEditTarget, type RootOption } from "./category-form-sheet";

// /settings/categories manager: Chi tiêu/Thu nhập tabs (both trees fetched
// server-side, toggled client-side), per-category month spend, add/edit/archive,
// and drag-and-drop reordering within each sibling group (roots; a root's
// children). Order persists via reorderCategories; the server order wins on
// revalidate (local state reconciles from props).
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

  // Local order so a drag reorders optimistically; reconciled from props after the
  // server action revalidates (authoritative order wins, avoiding drift).
  const [expense, setExpense] = React.useState(expenseTree);
  const [income, setIncome] = React.useState(incomeTree);
  React.useEffect(() => setExpense(expenseTree), [expenseTree]);
  React.useEffect(() => setIncome(incomeTree), [incomeTree]);

  const [, startTransition] = React.useTransition();

  const tree = kind === "expense" ? expense : income;
  const setTree = kind === "expense" ? setExpense : setIncome;

  const roots: RootOption[] = [...expense, ...income].map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
  }));
  const childCount = tree.reduce((n, r) => n + r.children.length, 0);

  // A small activation distance keeps taps/scrolls from starting a drag; the
  // keyboard sensor makes the handle operable without a pointer.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function persistOrder(parentId: string | null, orderedIds: string[]) {
    if (orderedIds.length === 0) return;
    startTransition(() =>
      reorderCategories({
        kind,
        parentId,
        orderedIds: orderedIds as [string, ...string[]],
      }).catch(() => {
        // On rejection (stale list / scope mismatch) drop the optimistic order back
        // to the server's by reconciling from the current props.
        setExpense(expenseTree);
        setIncome(incomeTree);
      }),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Root group: both ids are roots of the active kind.
    const rootIds = tree.map((r) => r.id);
    if (rootIds.includes(activeId) && rootIds.includes(overId)) {
      const next = arrayMove(tree, rootIds.indexOf(activeId), rootIds.indexOf(overId));
      setTree(next);
      persistOrder(
        null,
        next.map((r) => r.id),
      );
      return;
    }

    // Child group: active + over are children of the same parent (no cross-parent).
    const parent = tree.find((r) => r.children.some((c) => c.id === activeId));
    if (parent && parent.children.some((c) => c.id === overId)) {
      const childIds = parent.children.map((c) => c.id);
      const nextChildren = arrayMove(
        parent.children,
        childIds.indexOf(activeId),
        childIds.indexOf(overId),
      );
      setTree(tree.map((r) => (r.id === parent.id ? { ...r, children: nextChildren } : r)));
      persistOrder(
        parent.id,
        nextChildren.map((c) => c.id),
      );
    }
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <Card className="divide-y divide-border overflow-hidden">
            <SortableContext items={tree.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {tree.map((root) => (
                <div key={root.id}>
                  <CategoryRow node={root} onEdit={openEdit} />
                  <SortableContext
                    items={root.children.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {root.children.map((child) => (
                      <ChildRow key={child.id} child={child} onEdit={openEdit} />
                    ))}
                  </SortableContext>
                </div>
              ))}
            </SortableContext>
          </Card>
        </DndContext>
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

// Focusable drag handle shared by both row levels. dnd-kit's keyboard sensor uses
// the handle's listeners to start a keyboard drag (Space) and announces moves.
type SortableHandleProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

function DragHandle({ attributes, listeners }: SortableHandleProps) {
  return (
    <button
      type="button"
      aria-label="Kéo để sắp xếp"
      className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );
}

function CategoryRow({ node, onEdit }: { node: CategoryNode; onEdit: (c: CategoryNode) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const Icon = getCategoryIcon(node.icon);
  const color = node.color ?? "#64748B";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-surface p-4",
        isDragging && "relative z-10 opacity-70 shadow-sm",
      )}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-surface py-3 pl-8 pr-4",
        isDragging && "relative z-10 opacity-70 shadow-sm",
      )}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
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
