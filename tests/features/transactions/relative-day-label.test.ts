import { describe, expect, it } from "vitest";
import { relativeDayLabel, ictDateKey } from "@/features/transactions/lib/relative-day-label";

// now = 2026-06-15 (Mon) 17:00 ICT == 10:00 UTC. ICT is a fixed +07:00.
const NOW = new Date("2026-06-15T10:00:00Z");

// Helper: an instant that lands on a given ICT calendar date (noon ICT = 05:00Z).
const ictNoon = (ymd: string) => new Date(`${ymd}T05:00:00Z`);

describe("relativeDayLabel (ICT calendar)", () => {
  it("today → Hôm nay", () => {
    expect(relativeDayLabel(ictNoon("2026-06-15"), NOW)).toBe("Hôm nay");
  });

  it("yesterday → Hôm qua", () => {
    expect(relativeDayLabel(ictNoon("2026-06-14"), NOW)).toBe("Hôm qua");
  });

  it("within last 6 days → Vietnamese weekday", () => {
    expect(relativeDayLabel(ictNoon("2026-06-13"), NOW)).toBe("Thứ 7"); // Sat
    expect(relativeDayLabel(ictNoon("2026-06-12"), NOW)).toBe("Thứ 6"); // Fri
    expect(relativeDayLabel(ictNoon("2026-06-10"), NOW)).toBe("Thứ 4"); // Wed
    expect(relativeDayLabel(ictNoon("2026-06-09"), NOW)).toBe("Thứ 3"); // 6 days ago (Tue)
  });

  it("7+ days ago → DD/MM/YYYY", () => {
    expect(relativeDayLabel(ictNoon("2026-06-08"), NOW)).toBe("08/06/2026");
    expect(relativeDayLabel(ictNoon("2026-01-01"), NOW)).toBe("01/01/2026");
  });

  it("compares on ICT calendar date, not raw ms (midnight boundary)", () => {
    // 2026-06-14 17:01 UTC = 2026-06-15 00:01 ICT → today, not yesterday.
    expect(relativeDayLabel(new Date("2026-06-14T17:01:00Z"), NOW)).toBe("Hôm nay");
    // 2026-06-14 16:59 UTC = 2026-06-14 23:59 ICT → yesterday.
    expect(relativeDayLabel(new Date("2026-06-14T16:59:00Z"), NOW)).toBe("Hôm qua");
  });
});

describe("ictDateKey", () => {
  it("returns ICT YYYY-MM-DD across the UTC boundary", () => {
    expect(ictDateKey(new Date("2026-06-14T17:01:00Z"))).toBe("2026-06-15");
    expect(ictDateKey(new Date("2026-06-14T16:59:00Z"))).toBe("2026-06-14");
  });
});
