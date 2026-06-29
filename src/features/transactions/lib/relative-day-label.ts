import { formatDate } from "@/lib/locale";

// Relative day labels for day-grouped transaction headers. Compares on ICT
// calendar dates (not raw ms) so labels never drift across the UTC boundary.
// Vietnam is a fixed UTC+07:00, so an ICT day is unambiguous.

const ICT = "Asia/Ho_Chi_Minh";

const ictYmdFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ICT,
});

const ictWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: ICT,
});

// Vietnamese weekday names. VN convention: Monday..Saturday are "Thứ 2".."Thứ 7",
// Sunday is "Chủ nhật".
const VI_WEEKDAY: Record<string, string> = {
  Sun: "Chủ nhật",
  Mon: "Thứ 2",
  Tue: "Thứ 3",
  Wed: "Thứ 4",
  Thu: "Thứ 5",
  Fri: "Thứ 6",
  Sat: "Thứ 7",
};

/** `YYYY-MM-DD` as seen in ICT — stable, locale-independent day key. */
export function ictDateKey(date: Date): string {
  return ictYmdFormatter.format(date);
}

// Whole-day difference (a − b) between two ICT date keys. Parsing both as UTC
// midnight cancels the timezone, leaving an exact day count.
function dayDiff(aKey: string, bKey: string): number {
  const a = Date.parse(`${aKey}T00:00:00Z`);
  const b = Date.parse(`${bKey}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

/**
 * Relative label for a transaction's day:
 * - today → `Hôm nay`
 * - yesterday → `Hôm qua`
 * - within the last 6 days → Vietnamese weekday (`Thứ 2`..`Thứ 7`, `Chủ nhật`)
 * - otherwise → `DD/MM/YYYY`
 *
 * `now` is injectable for deterministic tests.
 */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  const ago = dayDiff(ictDateKey(now), ictDateKey(date));
  if (ago === 0) return "Hôm nay";
  if (ago === 1) return "Hôm qua";
  if (ago >= 2 && ago <= 6) return VI_WEEKDAY[ictWeekdayFormatter.format(date)] ?? formatDate(date);
  return formatDate(date);
}
