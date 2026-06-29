// Pure month-over-month delta math. No DB / "server-only", so it is unit-testable
// without a database and safe to import anywhere (mirrors how range-presets.ts is
// kept pure). `pct` is null when the previous period had no activity — that avoids
// divide-by-zero / Infinity% and lets callers show an abs-only ("mới") state.

export type DeltaDirection = "up" | "down" | "flat";

export type Delta = {
  /** Signed absolute change (current − previous), whole VND. */
  abs: number;
  /** Signed percentage change relative to |previous|, or null when previous === 0. */
  pct: number | null;
  direction: DeltaDirection;
};

/** Turns two period totals into a signed delta with a percentage and direction. */
export function computeDelta(current: number, previous: number): Delta {
  const abs = current - previous;
  const direction: DeltaDirection = abs > 0 ? "up" : abs < 0 ? "down" : "flat";
  // Denominator is the magnitude of the previous total so the pct sign tracks
  // `abs` even when the previous total was negative (a net can be below zero).
  const pct = previous === 0 ? null : (abs / Math.abs(previous)) * 100;
  return { abs, pct, direction };
}
