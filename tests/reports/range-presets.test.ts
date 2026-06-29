import { describe, expect, it } from "vitest";
import {
  getRange,
  parsePreset,
  defaultGranularity,
  presetLabel,
  formatRangeLabel,
  previousRange,
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

  it("formatRangeLabel shows the year once for a same-year range", () => {
    expect(formatRangeLabel({ from: "2026-06-01", to: "2026-06-30" })).toBe("1/6 – 30/6/2026");
  });

  it("formatRangeLabel shows both years for a cross-year range", () => {
    expect(formatRangeLabel({ from: "2025-12-01", to: "2026-01-05" })).toBe("1/12/2025 – 5/1/2026");
  });

  it("formatRangeLabel collapses a same-day range to a single date", () => {
    expect(formatRangeLabel({ from: "2026-06-15", to: "2026-06-15" })).toBe("15/6/2026");
  });

  it("previousRange for mtd is the full previous calendar month", () => {
    expect(previousRange("mtd", getRange("mtd", NOW), NOW)).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
  });

  it("previousRange for last-month is the month before last", () => {
    expect(previousRange("last-month", getRange("last-month", NOW), NOW)).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });

  it("previousRange for last-3m is the preceding 3-month block", () => {
    expect(previousRange("last-3m", getRange("last-3m", NOW), NOW)).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
    });
  });

  it("previousRange for custom is an equal-length window ending the day before", () => {
    // 10-day window 6–15 June → preceding 10 days 27 May–5 June.
    expect(previousRange("custom", { from: "2026-06-06", to: "2026-06-15" }, NOW)).toEqual({
      from: "2026-05-27",
      to: "2026-06-05",
    });
  });
});
