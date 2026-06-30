"use client";
import * as React from "react";
import { Fab } from "@/components/fab";
import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { GoalPickerOption } from "@/features/goals/components/goal-picker";
import { QuickAddSheet, type AccountOption, type DefaultCategoryByKind } from "./quick-add-sheet";

// Mounts the FAB + quick-add sheet and owns the open state. Dropped onto the
// dashboard, transactions, and account-detail surfaces (each passes its active
// accounts + the category list for the picker, and optionally active goals). The
// pages resolve the default account + per-kind default category and pass them so
// the sheet opens pre-filled.
export function QuickAddLauncher({
  accounts,
  categories,
  goals = [],
  defaultAccountId,
  defaultCategoryByKind,
}: {
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  goals?: GoalPickerOption[];
  defaultAccountId?: string;
  defaultCategoryByKind?: DefaultCategoryByKind;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} />
      <QuickAddSheet
        accounts={accounts}
        categories={categories}
        goals={goals}
        open={open}
        onOpenChange={setOpen}
        defaultAccountId={defaultAccountId}
        defaultCategoryByKind={defaultCategoryByKind}
      />
    </>
  );
}
