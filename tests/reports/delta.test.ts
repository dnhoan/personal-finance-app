import { describe, expect, it } from "vitest";
import { computeDelta } from "@/features/reports/lib/delta";

describe("computeDelta", () => {
  it("reports an increase", () => {
    expect(computeDelta(120, 100)).toEqual({ abs: 20, pct: 20, direction: "up" });
  });

  it("reports a decrease", () => {
    expect(computeDelta(80, 100)).toEqual({ abs: -20, pct: -20, direction: "down" });
  });

  it("reports flat when unchanged", () => {
    expect(computeDelta(100, 100)).toEqual({ abs: 0, pct: 0, direction: "flat" });
  });

  it("returns pct: null when the previous period had no activity", () => {
    expect(computeDelta(50, 0)).toEqual({ abs: 50, pct: null, direction: "up" });
  });

  it("treats zero-to-zero as flat with null pct", () => {
    expect(computeDelta(0, 0)).toEqual({ abs: 0, pct: null, direction: "flat" });
  });

  it("keeps the pct sign tracking abs when the previous total is negative", () => {
    // previous net was −100 (a loss); current 0 is an improvement of +100.
    expect(computeDelta(0, -100)).toEqual({ abs: 100, pct: 100, direction: "up" });
  });
});
