import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listAccountsWithBalance } from "@/features/accounts/queries";
import { groupAccounts, type GroupedAccounts } from "@/features/accounts/account-grouping";
import { firstDueDate, anchorToVnDate } from "@/features/recurring/lib/rrule-builder";
import type { DateRange, Granularity } from "./lib/range-presets";

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

// VN calendar date "YYYY-MM-DD" of an arbitrary instant.
function ictDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// All aggregates here exclude `kind = 'transfer'` from income/expense flow (a
// transfer is money moving between own accounts, not a gain or loss). Month
// buckets read the generated `occurred_month_ict` column — never re-derive the
// TZ math from occurred_at. Day buckets cast occurred_at into ICT once.

const CURRENT_MONTH_ICT = sql`date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

export type NetCashFlow = { income: number; expense: number; net: number };

// Hero metric: income − expenses for the current ICT month, transfers excluded.
export async function netCashFlowMtd(userId: string): Promise<NetCashFlow> {
  const rows = await db.execute<{ income: string; expense: string }>(sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0)::text  AS income,
      COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0)::text AS expense
    FROM transactions
    WHERE user_id = ${userId}
      AND kind <> 'transfer'
      AND occurred_month_ict = ${CURRENT_MONTH_ICT}
  `);
  const r = rows.rows[0];
  const income = Number(r?.income ?? 0);
  const expense = Number(r?.expense ?? 0);
  return { income, expense, net: income - expense };
}

export type NetWorthSnapshot = {
  net: number;
  assets: number;
  liabilities: number;
  /** Per-account balances (already debt/receivable-corrected), for the net-worth report. */
  grouped: GroupedAccounts;
};

// Net worth via the Phase 7 balance convention (debt/receivable count down to 0,
// receivables are assets). Reuses listAccountsWithBalance + groupAccounts — does
// NOT re-derive a naive signed-sum, which would double-count receivables and flip
// the debt sign.
export async function netWorthSnapshot(userId: string): Promise<NetWorthSnapshot> {
  const accounts = await listAccountsWithBalance(userId);
  const grouped = groupAccounts(accounts);
  return {
    net: grouped.total,
    assets: grouped.assets.subtotal,
    liabilities: grouped.liabilities.subtotal,
    grouped,
  };
}

export type CategorySpend = {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
};

// Top expense categories for the current ICT month, rolled up to ROOT category
// (a child's spend counts toward its parent) so the dashboard shows headline
// buckets. COALESCE on parent_id makes a root count as its own group.
export async function topCategoriesThisMonth(userId: string, limit = 3): Promise<CategorySpend[]> {
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
    WHERE t.user_id = ${userId}
      AND t.kind = 'expense'
      AND t.occurred_month_ict = ${CURRENT_MONTH_ICT}
    GROUP BY root.id, root.name, root.color, root.icon
    ORDER BY SUM(t.amount) DESC
    LIMIT ${limit}
  `);
  return rows.rows.map((r) => ({
    categoryId: r.category_id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    total: Number(r.total),
  }));
}

export type UpcomingRenewal = {
  id: string;
  amount: number;
  kind: "income" | "expense";
  nextDue: string;
  note: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

// Active recurring rules with an occurrence due within `days` (today..today+days,
// ICT), soonest first, with category icon for the dashboard strip.
//
// The displayed/filtered due date is recomputed from each rule's RRULE, NOT the
// stored `next_due` column: materialisation advances `next_due` past the 30-day
// lead window after pre-creating instances, so it can never fall inside a 7-day
// window. Expanding the rrule yields the true soonest upcoming occurrence.
export async function upcomingRenewals(
  userId: string,
  days = 7,
  now: Date = new Date(),
): Promise<UpcomingRenewal[]> {
  const rows = await db.execute<{
    id: string;
    amount: string;
    kind: "income" | "expense";
    rrule: string;
    note: string | null;
    category_name: string | null;
    category_icon: string | null;
    category_color: string | null;
  }>(sql`
    SELECT r.id, r.amount::text AS amount, r.kind, r.rrule, r.note,
           c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM recurring_rules r
    LEFT JOIN categories c ON c.id = r.category_id
    WHERE r.user_id = ${userId}
      AND r.active = true
  `);

  const todayYmd = ictDate(now);
  const cutoffYmd = ictDate(addDays(now, days));

  return rows.rows
    .map((r) => {
      const next = firstDueDate(r.rrule, now, true);
      return next ? { r, nextDue: anchorToVnDate(next) } : null;
    })
    .filter(
      (x): x is { r: (typeof rows.rows)[number]; nextDue: string } =>
        x != null && x.nextDue >= todayYmd && x.nextDue <= cutoffYmd,
    )
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue) || Number(b.r.amount) - Number(a.r.amount))
    .map(({ r, nextDue }) => ({
      id: r.id,
      amount: Number(r.amount),
      kind: r.kind,
      nextDue,
      note: r.note,
      categoryName: r.category_name,
      categoryIcon: r.category_icon,
      categoryColor: r.category_color,
    }));
}

export type CashFlowBucket = { bucket: string; income: number; expense: number; net: number };

// Income/expense per time bucket over a range, transfers excluded. Monthly
// buckets on occurred_month_ict; daily casts occurred_at to an ICT date. The
// bucket key is a "YYYY-MM-DD" string (month-start for monthly).
export async function cashFlowSeries(
  userId: string,
  range: DateRange,
  granularity: Granularity,
): Promise<CashFlowBucket[]> {
  // Monthly buckets group AND filter on the indexed `occurred_month_ict` column
  // (range ends truncated to month-start) so the predicate hits an index. Daily
  // buckets need per-day resolution, so they cast occurred_at into ICT once —
  // bounded by the ≤2-month daily window, not a wide scan.
  const monthly = granularity === "monthly";
  const bucketExpr = monthly
    ? sql`occurred_month_ict`
    : sql`(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;
  const rangeFilter = monthly
    ? sql`occurred_month_ict
          BETWEEN date_trunc('month', ${range.from}::date)::date
              AND date_trunc('month', ${range.to}::date)::date`
    : sql`(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          BETWEEN ${range.from}::date AND ${range.to}::date`;

  const rows = await db.execute<{ bucket: string; income: string; expense: string }>(sql`
    SELECT ${bucketExpr}::text AS bucket,
           COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0)::text  AS income,
           COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0)::text AS expense
    FROM transactions
    WHERE user_id = ${userId}
      AND kind <> 'transfer'
      AND ${rangeFilter}
    GROUP BY ${bucketExpr}
    ORDER BY ${bucketExpr} ASC
  `);
  return rows.rows.map((r) => {
    const income = Number(r.income);
    const expense = Number(r.expense);
    return { bucket: r.bucket, income, expense, net: income - expense };
  });
}

export type CronHeartbeat = { lastCheckedAt: Date | null };

// Single-row read of the renewal-alert heartbeat for the dashboard status badge.
export async function cronHeartbeat(): Promise<CronHeartbeat> {
  const rows = await db.execute<{ last_renewal_check_at: string | null }>(sql`
    SELECT last_renewal_check_at FROM cron_state LIMIT 1
  `);
  const raw = rows.rows[0]?.last_renewal_check_at ?? null;
  return { lastCheckedAt: raw ? new Date(raw) : null };
}
