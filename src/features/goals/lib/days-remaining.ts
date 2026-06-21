// Whole days from today (ICT) until a goal's target date "YYYY-MM-DD". Negative
// when overdue, null when the goal is open-ended. Pure date math on the ICT
// calendar day so it matches how target dates are entered/displayed.

function ictTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysUntil(targetDate: string | null, now: Date = new Date()): number | null {
  if (!targetDate) return null;
  const today = Date.parse(`${ictTodayIso(now)}T00:00:00Z`);
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  return Math.round((target - today) / 86_400_000);
}
