// Screen-reader-only data table mirroring a chart's data (WCAG: charts must have
// a non-visual equivalent). Rendered `sr-only` next to each chart. Pure, no deps
// on Recharts — just rows of label + numeric columns formatted in vi-VN.

import { formatVnd } from "@/lib/vnd";

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
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Mục</th>
          {columns.map((c) => (
            <th key={c.key} scope="col">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.label}-${i}`}>
            <th scope="row">{row.label}</th>
            {columns.map((c) => (
              <td key={c.key}>{formatVnd(row.values[c.key] ?? 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
