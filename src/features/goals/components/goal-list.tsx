"use client";
import * as React from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/back-link";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { archiveGoal } from "../actions";
import type { GoalsView, GoalWithProgress } from "../queries";
import { GoalRow } from "./goal-row";
import { GoalFormSheet, type GoalEditTarget } from "./goal-form-sheet";

type AccountOption = { id: string; name: string };

// Goals surface: summary + active/archived toggle + rows. Owns the form-sheet and
// archive transitions. Archived goals keep their progress (history intact).
export function GoalList({ view, accounts }: { view: GoalsView; accounts: AccountOption[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GoalEditTarget>(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const active = view.goals.filter((g) => !g.archived);
  const archived = view.goals.filter((g) => g.archived);
  const visible = showArchived ? view.goals : active;

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(g: GoalWithProgress) {
    setEditing(g);
    setSheetOpen(true);
  }
  function toggleArchive(g: GoalWithProgress) {
    startTransition(() => void archiveGoal({ id: g.id, archived: !g.archived }));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        href="/settings"
        label="Mục tiêu"
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus size={18} aria-hidden="true" /> Mục tiêu mới
          </Button>
        }
      />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Tổng tiết kiệm
        </p>
        <p
          className="mt-1 text-3xl font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {formatVnd(view.summary.totalProgress)}
        </p>
        <p className="mt-1 text-[12px] text-fg-muted">
          trong{" "}
          <span className="font-semibold tabular-nums">{formatVnd(view.summary.totalTarget)}</span>{" "}
          · {view.summary.activeCount} mục tiêu đang hoạt động
        </p>
      </section>

      {archived.length > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="self-start text-[13px] font-medium text-primary"
        >
          {showArchived ? "Ẩn đã lưu trữ" : `Hiện đã lưu trữ (${archived.length})`}
        </button>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Target size={32} className="text-fg-subtle" aria-hidden="true" />
          <p className="text-fg-muted">Chưa có mục tiêu nào.</p>
          <p className="text-sm text-fg-subtle">Tạo mục tiêu và gắn các khoản tiết kiệm vào nó.</p>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-4", pending && "opacity-60")}>
          {visible.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onEdit={() => openEdit(g)}
              onArchive={() => toggleArchive(g)}
            />
          ))}
        </div>
      )}

      <GoalFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        accounts={accounts}
      />
    </div>
  );
}
