import { describe, expect, it } from "vitest";
import {
  currentIctMonth,
  parseMonthKey,
  monthStartDate,
  addMonths,
  formatMonthLabel,
  daysInMonth,
  daysLeftInMonth,
} from "@/lib/month";

describe("month helpers", () => {
  it("currentIctMonth reads the ICT wall-clock month across the UTC boundary", () => {
    // 2026-05-31 23:30 UTC = 2026-06-01 06:30 ICT → June, not May.
    expect(currentIctMonth(new Date("2026-05-31T23:30:00Z"))).toBe("2026-06");
  });

  it("parseMonthKey validates and falls back to current", () => {
    expect(parseMonthKey("2026-03")).toBe("2026-03");
    expect(parseMonthKey("garbage", new Date("2026-06-15T10:00:00Z"))).toBe("2026-06");
    expect(parseMonthKey("2026-13", new Date("2026-06-15T10:00:00Z"))).toBe("2026-06");
    expect(parseMonthKey(undefined, new Date("2026-06-15T10:00:00Z"))).toBe("2026-06");
  });

  it("monthStartDate appends -01", () => {
    expect(monthStartDate("2026-05")).toBe("2026-05-01");
  });

  it("addMonths handles year wrap both directions", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-06", 0)).toBe("2026-06");
    expect(addMonths("2026-03", -5)).toBe("2025-10");
  });

  it("formatMonthLabel produces Vietnamese labels", () => {
    expect(formatMonthLabel("2026-05")).toBe("Tháng 5 2026");
    expect(formatMonthLabel("2026-12")).toBe("Tháng 12 2026");
  });

  it("daysInMonth counts correctly incl February leap", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-01")).toBe(31);
  });

  it("daysLeftInMonth is 0 for a non-current month", () => {
    expect(daysLeftInMonth("2026-01", new Date("2026-06-15T10:00:00Z"))).toBe(0);
  });

  it("daysLeftInMonth counts remaining days of the current ICT month", () => {
    // 2026-06-15 10:00 UTC = 17:00 ICT, day 15 → 30 − 15 = 15 left.
    expect(daysLeftInMonth("2026-06", new Date("2026-06-15T10:00:00Z"))).toBe(15);
  });
});
