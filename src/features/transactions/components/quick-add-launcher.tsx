"use client";
import * as React from "react";
import { Fab } from "@/components/fab";
import { QuickAddSheet, type AccountOption } from "./quick-add-sheet";

// Mounts the FAB + quick-add sheet and owns the open state. Dropped onto both
// the dashboard and the transactions page (each passes its active accounts).
export function QuickAddLauncher({ accounts }: { accounts: AccountOption[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} />
      <QuickAddSheet accounts={accounts} open={open} onOpenChange={setOpen} />
    </>
  );
}
