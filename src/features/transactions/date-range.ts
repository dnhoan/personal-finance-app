// Resolves transaction-list date filters into UTC instants at Asia/Ho_Chi_Minh
// calendar boundaries. Vietnam is a fixed UTC+07:00 (no DST), so day boundaries
// are exact: ICT midnight = the prior day 17:00 UTC. Pure module — unit-tested.

export const RANGE_PRESETS = ["today", "week", "month", "last-month", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

const ICT_OFFSET = "+07:00";

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

// Y/M/D and ISO weekday (1=Mon..7=Sun) of a Date as seen in ICT.
function ictParts(date: Date): { y: number; m: number; d: number; weekday: number } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
  }).format(date);
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return { y, m, d, weekday: WEEKDAY_INDEX[wd] ?? 1 };
}

const pad = (n: number) => String(n).padStart(2, "0");

function startOfIctDay(y: number, m: number, d: number): Date {
  return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00.000${ICT_OFFSET}`);
}

function endOfIctDay(y: number, m: number, d: number): Date {
  return new Date(`${y}-${pad(m)}-${pad(d)}T23:59:59.999${ICT_OFFSET}`);
}

function addIctDays(start: Date, days: number): Date {
  return new Date(start.getTime() + days * 86_400_000);
}

export type ResolvedRange = { from?: Date; to?: Date };

export function resolveDateRange(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
  now: Date = new Date(),
): ResolvedRange {
  const { y, m, d, weekday } = ictParts(now);
  const todayEnd = endOfIctDay(y, m, d);

  switch (preset) {
    case "today":
      return { from: startOfIctDay(y, m, d), to: todayEnd };
    case "week": {
      // Monday-start week (VN convention).
      const monday = addIctDays(startOfIctDay(y, m, d), -(weekday - 1));
      return { from: monday, to: todayEnd };
    }
    case "month":
      return { from: startOfIctDay(y, m, 1), to: todayEnd };
    case "last-month": {
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const start = startOfIctDay(prevYear, prevMonth, 1);
      // Last day of previous month = day before this month's first day.
      const end = new Date(startOfIctDay(y, m, 1).getTime() - 1);
      return { from: start, to: end };
    }
    case "custom": {
      const range: ResolvedRange = {};
      if (customFrom) {
        const [fy, fm, fd] = customFrom.split("-").map(Number);
        if (fy && fm && fd) range.from = startOfIctDay(fy, fm, fd);
      }
      if (customTo) {
        const [ty, tm, td] = customTo.split("-").map(Number);
        if (ty && tm && td) range.to = endOfIctDay(ty, tm, td);
      }
      return range;
    }
  }
}
