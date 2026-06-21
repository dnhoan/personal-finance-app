"use client";
import * as React from "react";
import { Fab } from "@/components/fab";
import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { GoalPickerOption } from "@/features/goals/components/goal-picker";
import { QuickAddSheet, type AccountOption } from "./quick-add-sheet";

// Mounts the FAB + quick-add sheet and owns the open state. Dropped onto the
// dashboard, transactions, and account-detail surfaces (each passes its active
// accounts + the category list for the picker, and optionally active goals).
export function QuickAddLauncher({
  accounts,
  categories,
  goals = [],
}: {
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  goals?: GoalPickerOption[];
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
      />
    </>
  );
}
