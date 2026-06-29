import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { computeDelta } from "../lib/delta";

const MINUS = "−"; // U+2212, matches the app's signed amounts.

// Inline month-over-month delta chip. Direction is conveyed by icon + sign + text
// (never colour alone — WCAG): an up/down/flat arrow plus a signed percentage.
// `invert` flips the good/bad tone for expense-style metrics where "up" is bad.
// When the previous period had no activity (pct null) it shows "mới" instead of a
// meaningless percentage; it renders nothing at all when both periods are zero.
// Pure server component.
export function StatDelta({
  current,
  previous,
  invert = false,
  label,
}: {
  current: number;
  previous: number;
  /** Expense metrics: treat an increase as the bad (expense-tone) direction. */
  invert?: boolean;
  /** Optional trailing context, e.g. "so với tháng trước"; also read by SR. */
  label?: string;
}) {
  if (previous === 0 && current === 0) return null;

  const { pct, direction } = computeDelta(current, previous);
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  // good = an improvement: rising income/net, or falling expense.
  const good = direction === "flat" ? null : (direction === "up") !== invert;
  const tone = good === null ? "text-fg-muted" : good ? "text-income" : "text-expense";

  const sign = direction === "up" ? "+" : direction === "down" ? MINUS : "";
  const magnitude = pct === null ? null : Math.abs(Math.round(pct));
  const valueText = magnitude === null ? "mới" : `${sign}${magnitude}%`;

  const verb = direction === "up" ? "tăng" : direction === "down" ? "giảm" : "không đổi";
  const suffix = label ?? "so với tháng trước";
  const aria = magnitude === null ? `mới ${suffix}` : `${verb} ${magnitude}% ${suffix}`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-medium tabular-nums ${tone}`}
      aria-label={aria}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span aria-hidden="true">{valueText}</span>
      {label ? (
        <span aria-hidden="true" className="font-normal text-fg-subtle">
          {label}
        </span>
      ) : null}
    </span>
  );
}
