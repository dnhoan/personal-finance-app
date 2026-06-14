import { RRule, rrulestr, Weekday, type Frequency, type Options } from "rrule";

// RRULE construction + parsing for recurring rules. Pure, isomorphic (no React,
// no DB) so the form builds the same string the server validates and the
// materialiser expands.
//
// TZ invariant: every occurrence is anchored at 12:00 UTC (= 19:00 in
// Asia/Ho_Chi_Minh, safely mid-day). Vietnam has no DST, so a noon-UTC anchor
// makes both the displayed VN calendar day and the generated `occurred_month_ict`
// bucket deterministic — no luxon/tzid machinery, no cross-midnight drift, and a
// stable `occurred_at` so the (rule, occurrence) unique index dedupes reliably.

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RruleBuilderState = {
  freq: RecurrenceFreq;
  interval: number;
  /** ISO weekday numbers Mon=0..Sun=6 (WEEKLY only). */
  byWeekday: number[];
  /** Day of month 1..31 (MONTHLY only). */
  byMonthDay: number | null;
  /** VN calendar start date "YYYY-MM-DD". */
  startDate: string;
};

const ANCHOR_HOUR_UTC = 12;

const FREQ_TO_RRULE: Record<RecurrenceFreq, Frequency> = {
  YEARLY: RRule.YEARLY,
  MONTHLY: RRule.MONTHLY,
  WEEKLY: RRule.WEEKLY,
  DAILY: RRule.DAILY,
};
const RRULE_TO_FREQ: Record<number, RecurrenceFreq> = {
  [RRule.YEARLY]: "YEARLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.DAILY]: "DAILY",
};

/** VN calendar date → the canonical noon-UTC anchor Date for that day. */
export function vnDateToAnchor(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, ANCHOR_HOUR_UTC, 0, 0));
}

/** Noon-UTC anchor Date → VN calendar date "YYYY-MM-DD". */
export function anchorToVnDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildRruleString(state: RruleBuilderState): string {
  const options: Partial<Options> = {
    freq: FREQ_TO_RRULE[state.freq],
    interval: Math.max(1, Math.floor(state.interval) || 1),
    dtstart: vnDateToAnchor(state.startDate),
  };
  if (state.freq === "WEEKLY" && state.byWeekday.length > 0) {
    options.byweekday = state.byWeekday.map((w) => new Weekday(w));
  }
  if (state.freq === "MONTHLY" && state.byMonthDay != null) {
    options.bymonthday = state.byMonthDay;
  }
  return new RRule(options).toString();
}

/** Best-effort inverse: RRULE string → builder state, or null when unparseable
 *  or using options the visual builder can't represent (caller falls back to the
 *  raw expert input). */
export function parseRruleString(rrule: string): RruleBuilderState | null {
  try {
    const rule = rrulestr(rrule);
    const o = rule.origOptions;
    if (o.freq == null) return null;
    const freq = RRULE_TO_FREQ[o.freq];
    const dtstart = o.dtstart ?? rule.options.dtstart;
    if (!freq || !dtstart) return null;
    return {
      freq,
      interval: o.interval ?? 1,
      byWeekday: toWeekdayNumbers(o.byweekday),
      byMonthDay: toSingleMonthDay(o.bymonthday),
      startDate: anchorToVnDate(dtstart),
    };
  } catch {
    return null;
  }
}

export function isValidRrule(rrule: string): boolean {
  try {
    return rrulestr(rrule).options.freq != null;
  } catch {
    return false;
  }
}

/** The DTSTART embedded in the rule string (window-start floor for materialisation). */
export function ruleDtstart(rrule: string): Date {
  return rrulestr(rrule).options.dtstart;
}

/** First occurrence on/after `from` (inclusive by default), or null when the rule
 *  has no further occurrences (UNTIL/COUNT exhausted). */
export function firstDueDate(
  rrule: string,
  from: Date = new Date(),
  inclusive = true,
): Date | null {
  return rrulestr(rrule).after(from, inclusive);
}

/** Up to `count` occurrences on/after `after` — drives the next-dates preview. */
export function nextOccurrences(rrule: string, count: number, after: Date = new Date()): Date[] {
  const rule = rrulestr(rrule);
  const out: Date[] = [];
  let cursor = rule.after(after, true);
  let guard = 0;
  while (cursor && out.length < count && guard < 500) {
    out.push(cursor);
    cursor = rule.after(cursor, false);
    guard++;
  }
  return out;
}

/** Occurrences within [after, before], inclusive — bounded by `before` regardless
 *  of any COUNT, so a runaway rule can never explode the window. */
export function occurrencesBetween(rrule: string, after: Date, before: Date): Date[] {
  return rrulestr(rrule).between(after, before, true);
}

const WEEKDAY_VI = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

/** Vietnamese human description, e.g. "Hàng tháng · ngày 1", "6 tháng một lần". */
export function describeRrule(rrule: string): string {
  const s = parseRruleString(rrule);
  if (!s) return "Tùy chỉnh";
  const { freq, interval } = s;
  if (freq === "DAILY") return interval === 1 ? "Hàng ngày" : `${interval} ngày một lần`;
  if (freq === "WEEKLY") {
    const base = interval === 1 ? "Hàng tuần" : `${interval} tuần một lần`;
    const days = s.byWeekday
      .slice()
      .sort((a, b) => a - b)
      .map((w) => WEEKDAY_VI[w])
      .join(", ");
    return days ? `${base} · ${days}` : base;
  }
  if (freq === "MONTHLY") {
    const base = interval === 1 ? "Hàng tháng" : `${interval} tháng một lần`;
    return s.byMonthDay ? `${base} · ngày ${s.byMonthDay}` : base;
  }
  return interval === 1 ? "Hàng năm" : `${interval} năm một lần`;
}

/** Seed builder state from a start date: monthly on that day-of-month by default,
 *  with the weekday pre-filled so switching to weekly keeps the same day. */
export function defaultBuilderState(startDate: string): RruleBuilderState {
  const anchor = vnDateToAnchor(startDate);
  return {
    freq: "MONTHLY",
    interval: 1,
    byWeekday: [(anchor.getUTCDay() + 6) % 7], // JS Sun=0..Sat=6 → ISO Mon=0..Sun=6
    byMonthDay: anchor.getUTCDate(),
    startDate,
  };
}

function toWeekdayNumbers(input: unknown): number[] {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const out: number[] = [];
  for (const w of arr) {
    if (typeof w === "number") out.push(w);
    else if (w && typeof w === "object" && "weekday" in w) out.push((w as Weekday).weekday);
  }
  return out;
}

function toSingleMonthDay(input: unknown): number | null {
  if (input == null) return null;
  const v = Array.isArray(input) ? input[0] : input;
  return typeof v === "number" ? v : null;
}
