import { formatDate } from "@/lib/locale";
import type { TxListItem } from "../queries";
import { ictDateKey, relativeDayLabel } from "./relative-day-label";

export type DayGroup<T extends TxListItem = TxListItem> = {
  /** Stable ICT `YYYY-MM-DD` — React key + merge key, locale-independent. */
  key: string;
  /** Relative display label (`Hôm nay` / `Hôm qua` / weekday / `DD/MM/YYYY`). */
  label: string;
  /** `DD/MM/YYYY` for the day, shown alongside the relative label. */
  dateLabel: string;
  /** Net signed contribution for the day: +income, −expense, transfers excluded. */
  subtotal: number;
  items: T[];
};

// Signed display contribution of a row toward a day's net:
//   income → +amount, expense → −amount, transfer → 0 (net-neutral, excluded so
//   moving money between own accounts never distorts a day's spend).
function dayContribution(tx: TxListItem): number {
  if (tx.kind === "income") return Math.abs(tx.amount);
  if (tx.kind === "expense") return -Math.abs(tx.amount);
  return 0;
}

// Buckets a newest-first list into per-ICT-day groups, preserving order. The
// input is already sorted DESC, so first-seen day order == display order. Each
// group carries a relative label and a net subtotal (transfers excluded).
export function groupTransactionsByDay<T extends TxListItem>(
  transactions: T[],
  now: Date = new Date(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const byKey = new Map<string, DayGroup<T>>();
  for (const tx of transactions) {
    const key = ictDateKey(tx.occurredAt);
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        label: relativeDayLabel(tx.occurredAt, now),
        dateLabel: formatDate(tx.occurredAt),
        subtotal: 0,
        items: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(tx);
    group.subtotal += dayContribution(tx);
  }
  return groups;
}
