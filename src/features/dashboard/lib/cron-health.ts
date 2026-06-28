// Pure cron-heartbeat health logic. No DB / React so it is unit-testable. The
// dashboard badge surfaces a silent cron failure: if the last renewal-alert run
// is older than the stale threshold (or never ran), the alert pipeline may be
// down and the user should check their external cron config.

// A daily cron has 24h between runs; 25h gives a 1h grace before we flag it.
const STALE_HOURS = 25;
const HOUR_MS = 3_600_000;

export type CronHealth = {
  state: "ok" | "stale" | "never";
  /** Vietnamese relative label, e.g. "4 giờ trước" — empty when never run. */
  relative: string;
};

function relativeVi(deltaMs: number): string {
  const mins = Math.floor(deltaMs / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

// Classifies the heartbeat and produces its relative label. `now` injectable
// for deterministic tests.
export function cronHealth(lastCheckedAt: Date | null, now: Date = new Date()): CronHealth {
  if (!lastCheckedAt) return { state: "never", relative: "" };
  const deltaMs = now.getTime() - lastCheckedAt.getTime();
  const stale = deltaMs > STALE_HOURS * HOUR_MS;
  return { state: stale ? "stale" : "ok", relative: relativeVi(deltaMs) };
}
