import { describe, expect, it } from "vitest";
import {
  getRange,
  parsePreset,
  defaultGranularity,
  presetLabel,
} from "@/features/reports/lib/range-presets";

// Fixed "now": 2026-06-15 10:00 UTC = 17:00 ICT, still 15 June ICT.
const NOW = new Date("2026-06-15T10:00:00Z");

describe("range-presets", () => {
  it("mtd spans this ICT month-start to today", () => {
    expect(getRange("mtd", NOW)).toEqual({ from: "2026-06-01", to: "2026-06-15" });
  });

  it("last-month spans the full previous month", () => {
    expect(getRange("last-month", NOW)).toEqual({ from: "2026-05-01", to: "2026-05-31" });
  });

  it("last-3m starts two months back at month-start", () => {
    expect(getRange("last-3m", NOW)).toEqual({ from: "2026-04-01", to: "2026-06-15" });
  });

  it("last-12m starts eleven months back at month-start", () => {
    expect(getRange("last-12m", NOW)).toEqual({ from: "2025-07-01", to: "2026-06-15" });
  });

  it("crosses the UTC/ICT day boundary for mtd `to`", () => {
    // 2026-06-30 23:30 UTC = 2026-07-01 06:30 ICT → July, day 01.
    expect(getRange("mtd", new Date("2026-06-30T23:30:00Z"))).toEqual({
      from: "2026-07-01",
      to: "2026-07-01",
    });
  });

  it("custom orders the bounds and clamps to the 24-month floor", () => {
    expect(getRange("custom", NOW, { from: "2026-06-10", to: "2026-06-01" })).toEqual({
      from: "2026-06-01",
      to: "2026-06-10",
    });
    // 2023-01-01 is >24 months before 2026-06 → pulled forward to the floor.
    const clamped = getRange("custom", NOW, { from: "2023-01-01", to: "2026-06-15" });
    expect(clamped.from).toBe("2024-06-01");
  });

  it("custom rejects malformed dates, defaulting to this-month / today", () => {
    expect(getRange("custom", NOW, { from: "not-a-date", to: "2026-13-99" })).toEqual({
      from: "2026-06-01",
      to: "2026-06-15",
    });
  });

  it("parsePreset narrows unknown values to mtd", () => {
    expect(parsePreset("last-3m")).toBe("last-3m");
    expect(parsePreset("garbage")).toBe("mtd");
    expect(parsePreset(undefined)).toBe("mtd");
  });

  it("defaultGranularity is daily for single-month presets, monthly otherwise", () => {
    expect(defaultGranularity("mtd")).toBe("daily");
    expect(defaultGranularity("last-month")).toBe("daily");
    expect(defaultGranularity("last-3m")).toBe("monthly");
    expect(defaultGranularity("last-12m")).toBe("monthly");
  });

  it("presetLabel returns Vietnamese labels", () => {
    expect(presetLabel("mtd")).toBe("Tháng này");
    expect(presetLabel("last-12m")).toBe("12 tháng");
  });
});
