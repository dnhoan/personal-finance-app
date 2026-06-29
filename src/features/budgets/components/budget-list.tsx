"use client";
import * as React from "react";
import { Plus, CopyPlus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copyFromLastMonth } from "../actions";
import type { BudgetRowData, BudgetableCategory } from "../queries";
import { BudgetRow } from "./budget-row";
import { BudgetFormSheet, type BudgetEditTarget } from "./budget-form-sheet";

// Budget list + actions for one month. Rows tap-to-edit; header adds a budget or
// bulk-copies last month's (non-rollover) budgets. Owns the form-sheet state.
export function BudgetList({
  rows,
  budgetableCategories,
  periodMonth,
}: {
  rows: BudgetRowData[];
  budgetableCategories: BudgetableCategory[];
  /** Month-start "YYYY-MM-01". */
  periodMonth: string;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetEditTarget>(null);
  const [copying, startCopy] = React.useTransition();

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(row: BudgetRowData) {
    setEditing(row);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={openAdd} disabled={budgetableCategories.length === 0}>
          <Plus size={18} aria-hidden="true" /> Thêm hạn mức
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={copying}
          onClick={() => {
            if (window.confirm("Sao chép hạn mức (không gồm loại chuyển tháng) từ tháng trước?"))
              startCopy(() => void copyFromLastMonth({ periodMonth }));
          }}
        >
          <CopyPlus size={18} aria-hidden="true" /> Sao chép tháng trước
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Target size={32} className="text-fg-subtle" aria-hidden="true" />
          <p className="text-fg-muted">Chưa có hạn mức nào cho tháng này.</p>
          <p className="text-sm text-fg-subtle">Thêm hạn mức hoặc sao chép từ tháng trước.</p>
        </div>
      ) : (
        <>
          <Card className="divide-y border border-border divide-border overflow-hidden">
            {rows.map((row) => (
              <BudgetRow key={row.categoryId} row={row} onEdit={() => openEdit(row)} />
            ))}
          </Card>
          <p className="text-center text-[12px] text-fg-subtle">
            Nhấn vào hàng để chỉnh sửa hạn mức hoặc bật chuyển tháng.
          </p>
        </>
      )}

      <BudgetFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        periodMonth={periodMonth}
        editing={editing}
        budgetableCategories={budgetableCategories}
      />
    </div>
  );
}
