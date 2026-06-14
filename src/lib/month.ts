// Month helpers for the budgets surface. A "month key" is the string "YYYY-MM";
// the DB stores budget periods + the `occurred_month_ict` bucket as the
// month-start DATE "YYYY-MM-01". Pure string/int math — no Date drift — except
// `currentIctMonth`, which reads the wall-clock month in Asia/Ho_Chi_Minh.

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const MONTH_NAMES_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Current month ("YYYY-MM") as seen in Asia/Ho_Chi_Minh. */
export function currentIctMonth(now: Date = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return ymd.slice(0, 7); // "YYYY-MM"
}

/** Validates an arbitrary string as a month key, falling back to the current month. */
export function parseMonthKey(value: string | undefined, now: Date = new Date()): string {
  return value && MONTH_KEY_RE.test(value) ? value : currentIctMonth(now);
}

/** Month-start DATE "YYYY-MM-01" for DB comparison against period_month / occurred_month_ict. */
export function monthStartDate(monthKey: string): string {
  return `${monthKey}-01`;
}

/** Shifts a month key by `delta` months (handles year wrap). */
export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const zeroBased = y * 12 + (m - 1) + delta;
  const year = Math.floor(zeroBased / 12);
  const month = (zeroBased % 12) + 1;
  return `${year}-${pad2(month)}`;
}

/** Vietnamese label, e.g. "Tháng 5 2026". */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return `${MONTH_NAMES_VI[m - 1]} ${y}`;
}

/** Number of days in the month, and days remaining if it is the current ICT month. */
export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Days left in `monthKey` relative to today (ICT); 0 if the month is not current. */
export function daysLeftInMonth(monthKey: string, now: Date = new Date()): number {
  if (monthKey !== currentIctMonth(now)) return 0;
  const todayDay = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit" }).format(now),
  );
  return daysInMonth(monthKey) - todayDay;
}
