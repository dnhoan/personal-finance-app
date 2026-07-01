import { toIctDateInput } from "@/lib/locale";
import type { TxKind } from "../components/kind-toggle";

// Shared quick-add form helpers + types used by the /add capture screen. Kept
// framework-free so any surface can import without pulling in a component.

/** Minimal account shape the pickers need (id + display name). */
export type AccountOption = { id: string; name: string };

// Direction-specific submit copy — "Lưu khoản chi" reads more deliberately than a
// generic "Lưu giao dịch" and confirms what's about to be written.
export const SUBMIT_LABEL: Record<TxKind, string> = {
  expense: "Lưu khoản chi",
  income: "Lưu khoản thu",
  transfer: "Lưu chuyển khoản",
};

/** Default category id to pre-select per kind (transfer ignores category). */
export type DefaultCategoryByKind = { income: string | null; expense: string | null };

// The date field holds an ICT calendar date (`YYYY-MM-DD`); occurredAt on the
// row is a Date. When the picked day is today we keep `new Date()` so intra-day
// ordering and the row's time-of-day stay meaningful; a different day is anchored
// to noon ICT, which reads back as the same calendar date regardless of the
// viewer's timezone (avoids the UTC-midnight day-drift).
export function occurredAtFromInput(ymd: string): Date {
  if (!ymd || ymd === toIctDateInput(new Date())) return new Date();
  return new Date(`${ymd}T12:00:00+07:00`);
}

// First-category seed for a given kind. Transfer has no category; income/expense
// read their default, falling back to null ("Không có danh mục").
export function seedCategory(
  byKind: DefaultCategoryByKind | undefined,
  kind: TxKind,
): string | null {
  if (kind === "transfer") return null;
  return byKind?.[kind] ?? null;
}
