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
const MAX_MONTHS_BACK = 24;

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
