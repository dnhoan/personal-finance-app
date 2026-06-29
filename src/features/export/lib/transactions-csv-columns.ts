import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { formatVnd } from "@/lib/vnd";
import type { CsvColumn } from "./csv-stream";

// ICT day formatter for the timestamp `occurred_at`. `occurredAt` is a real
// Date (timestamptz), so the locale-aware Intl path is correct here — unlike the
// pure `YYYY-MM-DD` date-string columns (budgets/goals), which must be string-split
// to avoid a UTC-boundary day-drift. Output: dd/MM/yyyy.
const ictDate = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export type TxExportRow = {
  occurredAt: Date;
  kind: string;
  amount: string;
  merchant: string | null;
  note: string | null;
  categoryName: string | null;
  accountName: string;
};

const KIND_LABEL: Record<string, string> = {
  income: "Thu",
  expense: "Chi",
  transfer: "Chuyển",
};

export const txCsvColumns: CsvColumn<TxExportRow>[] = [
  { header: "Ngày", value: (r) => ictDate.format(r.occurredAt) },
  { header: "Loại", value: (r) => KIND_LABEL[r.kind] ?? r.kind },
  { header: "Số tiền", value: (r) => formatVnd(Number(r.amount)) },
  { header: "Tài khoản", value: (r) => r.accountName },
  { header: "Danh mục", value: (r) => r.categoryName ?? "" },
  { header: "Người bán", value: (r) => r.merchant ?? "" },
  { header: "Ghi chú", value: (r) => r.note ?? "" },
];

// Loads the user's full transaction history oldest-first (chronological export
// order). Scoped to user_id — defense-in-depth even in single-user. Single bounded
// query (the Neon serverless driver has no streaming cursor); for the MVP data
// volume (≤10k rows) this stays well within the function time budget, and the CSV
// builder still chunks the encode so response bytes flush incrementally.
export async function loadUserTransactionsForExport(userId: string): Promise<TxExportRow[]> {
  return db
    .select({
      occurredAt: transactions.occurredAt,
      kind: transactions.kind,
      amount: transactions.amount,
      merchant: transactions.merchant,
      note: transactions.note,
      categoryName: categories.name,
      accountName: accounts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.userId, userId)))
    .orderBy(asc(transactions.occurredAt), asc(transactions.id));
}
