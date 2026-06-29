// Pure time-range resolution for the /reports surface. No DB / "server-only", so
// it is unit-testable and safe to import from client components (the RangePicker).
//
// A "range" is two inclusive ICT calendar dates ("YYYY-MM-DD"). All math is done
// against the Asia/Ho_Chi_Minh wall clock so a preset like "this month" lines up
// with the `occurred_month_ict` bucket the queries filter on — never UTC-derived.

import { currentIctMonth, monthStartDate, addMonths, daysInMonth } from "@/lib/month";

export const RANGE_PRESETS = ["mtd", "last-month", "last-3m", "last-12m", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** Inclusive ICT date range; both ends are "YYYY-MM-DD". */
export type DateRange = { from: string; to: string };

/** Default chart granularity per preset: a single month renders daily, wider spans monthly. */
export type Granularity = "daily" | "monthly";

// Hard cap so a crafted ?from=... can't trigger a full-table scan across years.
// Exported as the shared windowing cap (e.g. the net-worth trend query reuses it).
export const MAX_MONTHS_BACK = 24;

const VI_PRESET_LABELS: Record<RangePreset, string> = {
  mtd: "Tháng này",
  "last-month": "Tháng trước",
  "last-3m": "3 tháng",
  "last-12m": "12 tháng",
  custom: "Tùy chọn",
};

/** Vietnamese label for a preset (used by the segmented RangePicker). */
export function presetLabel(preset: RangePreset): string {
  return VI_PRESET_LABELS[preset];
}

/** Narrows an arbitrary string to a known preset, defaulting to "mtd". */
export function parsePreset(value: string | undefined): RangePreset {
  return RANGE_PRESETS.includes(value as RangePreset) ? (value as RangePreset) : "mtd";
}

/** Last day ("YYYY-MM-DD") of the month a month-key ("YYYY-MM") denotes. */
function monthEndDate(monthKey: string): string {
  return `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, "0")}`;
}

/** Today ("YYYY-MM-DD") as seen in Asia/Ho_Chi_Minh. */
function todayIct(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Clamps a custom range to a valid, capped window: rejects malformed dates,
// orders the ends, and pulls `from` forward if it reaches past MAX_MONTHS_BACK.
function resolveCustom(now: Date, fromRaw?: string, toRaw?: string): DateRange {
  const today = todayIct(now);
  let from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : monthStartDate(currentIctMonth(now));
  let to = toRaw && DATE_RE.test(toRaw) ? toRaw : today;
  if (from > to) [from, to] = [to, from];
  // No future rows exist; clamp `to` to today so the window stays bounded.
  if (to > today) to = today;

  const floor = `${addMonths(currentIctMonth(now), -MAX_MONTHS_BACK)}-01`;
  if (from < floor) from = floor;
  return { from, to };
}

/**
 * Resolves a preset (+ optional custom bounds) to an inclusive ICT date range.
 * `now` is injectable for deterministic tests.
 */
export function getRange(
  preset: RangePreset,
  now: Date = new Date(),
  custom?: { from?: string; to?: string },
): DateRange {
  const thisMonth = currentIctMonth(now);
  switch (preset) {
    case "mtd":
      return { from: monthStartDate(thisMonth), to: todayIct(now) };
    case "last-month": {
      const prev = addMonths(thisMonth, -1);
      return { from: monthStartDate(prev), to: monthEndDate(prev) };
    }
    case "last-3m":
      return { from: monthStartDate(addMonths(thisMonth, -2)), to: todayIct(now) };
    case "last-12m":
      return { from: monthStartDate(addMonths(thisMonth, -11)), to: todayIct(now) };
    case "custom":
      return resolveCustom(now, custom?.from, custom?.to);
  }
}

/** Daily for a single-month span (mtd / last-month), monthly otherwise. */
export function defaultGranularity(preset: RangePreset): Granularity {
  return preset === "mtd" || preset === "last-month" ? "daily" : "monthly";
}

/** ISO "YYYY-MM-DD" of a UTC-anchored Date (the day math below stays in UTC). */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Equal-length window ending the day before `range.from` (used for custom ranges).
function precedingEqualWindow(range: DateRange): DateRange {
  const dayMs = 86_400_000;
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  const spanDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (spanDays - 1) * dayMs);
  return { from: isoDate(prevFrom), to: isoDate(prevTo) };
}

/**
 * The period immediately preceding a resolved range, for month-over-month style
 * deltas. Same basis family as the dashboard hero:
 *  - mtd          → the FULL previous calendar month (MTD compares against whole)
 *  - last-month   → the month before last (full)
 *  - last-3m      → the 3 full months before the current 3-month window
 *  - last-12m     → the 12 full months before the current 12-month window
 *  - custom       → an equal-length window ending the day before `range.from`
 * `now` is injectable for deterministic tests.
 */
export function previousRange(
  preset: RangePreset,
  range: DateRange,
  now: Date = new Date(),
): DateRange {
  const thisMonth = currentIctMonth(now);
  const monthSpan = (startBack: number, endBack: number): DateRange => ({
    from: monthStartDate(addMonths(thisMonth, startBack)),
    to: monthEndDate(addMonths(thisMonth, endBack)),
  });
  switch (preset) {
    case "mtd":
      return monthSpan(-1, -1);
    case "last-month":
      return monthSpan(-2, -2);
    case "last-3m":
      return monthSpan(-5, -3);
    case "last-12m":
      return monthSpan(-23, -12);
    case "custom":
      return precedingEqualWindow(range);
  }
}

/**
 * Human-readable Vietnamese label for a resolved range, e.g. "1/6 – 30/6/2026".
 * Pure string math on the inclusive ICT bounds — no TZ re-derivation:
 *  - same day            → "15/6/2026"
 *  - same year           → "1/6 – 30/6/2026" (year shown once, on the end)
 *  - spanning years      → "1/12/2025 – 5/1/2026"
 */
export function formatRangeLabel(range: DateRange): string {
  const [fy, fm, fd] = range.from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = range.to.split("-").map(Number) as [number, number, number];
  if (range.from === range.to) return `${fd}/${fm}/${fy}`;
  const start = fy === ty ? `${fd}/${fm}` : `${fd}/${fm}/${fy}`;
  return `${start} – ${td}/${tm}/${ty}`;
}
