/**
 * Vietnam-locale date/time formatting. VN conventions: DD/MM/YYYY dates, 24h
 * time, Asia/Ho_Chi_Minh timezone. Pure module — usable on client and server.
 */

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** `15/06/2026` */
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** `15/06/2026 09:30` */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** `09:30` — ICT time of day, paired with a day header that carries the date. */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/**
 * Returns the `YYYY-MM-DD` string for a Date as seen in Asia/Ho_Chi_Minh — the
 * value `<input type="date">` and date-typed DB columns expect. Built from the
 * ICT calendar parts so it never drifts a day across the UTC boundary.
 */
/**
 * `2026-06-15` → `15/06/2026`. Reformats a `<input type="date">` value (already
 * an ICT calendar date) for VN display without any timezone math. Returns `""`
 * for a malformed value so callers can fall back to a placeholder.
 */
export function formatDateInputDisplay(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

export function toIctDateInput(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  return parts; // en-CA yields YYYY-MM-DD
}
