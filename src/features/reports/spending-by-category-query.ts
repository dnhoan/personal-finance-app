import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { DateRange } from "./lib/range-presets";

// Expense breakdown for the spending donut over an arbitrary ICT date range.
// Transfers carry no category and are naturally excluded by `kind = 'expense'`.
// The donut drills one level: top call returns ROOT groups; passing a rootId
// returns that root's CHILD breakdown (plus the root's own un-childed spend).

export type SpendingSlice = {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
};

// Caps the donut at 8 visible slices and rolls the remainder into a grey
// "Khác" (Other) bucket so a long tail of tiny categories stays legible.
const MAX_SLICES = 8;
const OTHER_COLOR = "#8E8B87";

function withOtherBucket(slices: SpendingSlice[]): SpendingSlice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const head = slices.slice(0, MAX_SLICES - 1);
  const tail = slices.slice(MAX_SLICES - 1);
  const otherTotal = tail.reduce((sum, s) => sum + s.total, 0);
  return [
    ...head,
    {
      categoryId: "__other__",
      name: `Khác (${tail.length})`,
      color: OTHER_COLOR,
      icon: null,
      total: otherTotal,
    },
  ];
}

const RANGE_FILTER = (userId: string, range: DateRange) => sql`
  t.user_id = ${userId}
  AND t.kind = 'expense'
  AND (t.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      BETWEEN ${range.from}::date AND ${range.to}::date
`;

// Single-SUM total expense over a range (same filter as the breakdown), for the
// spending header's period total + month-over-month delta. Lighter than pulling
// the whole breakdown a second time just to total it.
export async function spendingTotalForRange(userId: string, range: DateRange): Promise<number> {
  const rows = await db.execute<{ total: string }>(sql`
    SELECT COALESCE(SUM(t.amount), 0)::text AS total
    FROM transactions t
    WHERE ${RANGE_FILTER(userId, range)}
  `);
  return Number(rows.rows[0]?.total ?? 0);
}

// Top-level: every expense rolled up to its root category, descending by spend.
async function rootSpending(userId: string, range: DateRange): Promise<SpendingSlice[]> {
  const rows = await db.execute<{
    category_id: string;
    name: string;
    color: string | null;
    icon: string | null;
    total: string;
  }>(sql`
    SELECT root.id AS category_id, root.name, root.color, root.icon,
           SUM(t.amount)::text AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    JOIN categories root ON root.id = COALESCE(c.parent_id, c.id)
    WHERE ${RANGE_FILTER(userId, range)}
    GROUP BY root.id, root.name, root.color, root.icon
    ORDER BY SUM(t.amount) DESC
  `);
  return rows.rows.map(toSlice);
}

// Drill: a single root's children, plus the root's own directly-categorised
// spend surfaced as a "(trực tiếp)" slice so totals reconcile with the parent.
async function childSpending(
  userId: string,
  range: DateRange,
  rootId: string,
): Promise<SpendingSlice[]> {
  const rows = await db.execute<{
    category_id: string;
    name: string;
    color: string | null;
    icon: string | null;
    total: string;
    is_root: boolean;
  }>(sql`
    SELECT c.id AS category_id, c.name, c.color, c.icon,
           SUM(t.amount)::text AS total,
           (c.id = ${rootId}) AS is_root
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE ${RANGE_FILTER(userId, range)}
      AND (c.id = ${rootId} OR c.parent_id = ${rootId})
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY SUM(t.amount) DESC
  `);
  return rows.rows.map((r) => {
    const slice = toSlice(r);
    if (r.is_root) slice.name = `${r.name} (trực tiếp)`;
    return slice;
  });
}

function toSlice(r: {
  category_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  total: string;
}): SpendingSlice {
  return {
    categoryId: r.category_id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    total: Number(r.total),
  };
}

export type SpendingBreakdown = {
  slices: SpendingSlice[];
  total: number;
  /** Root being drilled into, or null at the top level. */
  drillRootId: string | null;
  drillRootName: string | null;
};

// Donut data for a range. `drillRootId` (from the ?drill= search param) switches
// to that root's child breakdown; null returns the top-level root view.
export async function spendingByCategory(
  userId: string,
  range: DateRange,
  drillRootId: string | null = null,
): Promise<SpendingBreakdown> {
  const raw = drillRootId
    ? await childSpending(userId, range, drillRootId)
    : await rootSpending(userId, range);
  const slices = withOtherBucket(raw);
  const total = raw.reduce((sum, s) => sum + s.total, 0);
  const drillRootName = drillRootId
    ? (raw.find((s) => s.categoryId === drillRootId)?.name.replace(" (trực tiếp)", "") ?? null)
    : null;
  return { slices, total, drillRootId, drillRootName };
}
