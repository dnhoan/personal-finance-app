"use client";

// Data table mirroring a chart's data (WCAG: charts must have a non-visual
// equivalent). Always present for screen readers; collapsed to `sr-only` so the
// data stays in the accessibility tree, with a visible toggle that reveals a
// styled table for sighted users. Pure, no Recharts deps — rows of label +
// numeric columns formatted in vi-VN.

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";

export type DataTableColumn = { key: string; label: string };
export type DataTableRow = { label: string; values: Record<string, number> };

export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const tableId = React.useId();

  if (rows.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={tableId}
        className="inline-flex items-center gap-1 rounded-md text-[12px] font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        />
        {open ? "Ẩn dữ liệu" : "Xem dữ liệu"}
      </button>

      <div className={cn(open ? "mt-2 overflow-x-auto" : "sr-only")}>
        <table id={tableId} className={cn(open && "w-full text-sm")}>
          <caption className={cn(open && "mb-2 text-left text-[12px] text-fg-subtle")}>
            {caption}
          </caption>
          <thead>
            <tr className={cn(open && "border-b border-border")}>
              <th
                scope="col"
                className={cn(
                  open &&
                    "py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle",
                )}
              >
                Mục
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    open &&
                      "py-2 pl-3 text-right text-[11px] font-medium uppercase tracking-wide text-fg-subtle",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.label}-${i}`} className={cn(open && "border-b border-border/60")}>
                <th scope="row" className={cn(open && "py-2 pr-3 text-left font-medium text-fg")}>
                  {row.label}
                </th>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(open && "py-2 pl-3 text-right tabular-nums text-fg")}
                  >
                    {formatVnd(row.values[c.key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
