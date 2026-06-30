// Time-of-day greeting + today's date label, both read in Asia/Ho_Chi_Minh so
// they match the rest of the app's ICT wall-clock (see currentIctMonth). Pure
// functions over an injectable `now` for deterministic tests.

/** Hour 0–23 as seen in Asia/Ho_Chi_Minh. h23 cycle avoids a "24" at midnight. */
function ictHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}

/** Vietnamese time-of-day greeting, e.g. "Chào buổi sáng". */
export function ictGreeting(now: Date = new Date()): string {
  const h = ictHour(now);
  if (h >= 5 && h < 11) return "Chào buổi sáng";
  if (h >= 11 && h < 13) return "Chào buổi trưa";
  if (h >= 13 && h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Full Vietnamese date, e.g. "Thứ Hai, 30 tháng 6". */
export function ictDateLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}
