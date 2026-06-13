import { describe, expect, it } from "vitest";
import { resolveDateRange } from "@/features/transactions/date-range";

// now = 2026-06-15 17:00 ICT (= 10:00 UTC). ICT day boundaries are fixed +07:00.
const NOW = new Date("2026-06-15T10:00:00Z");

describe("resolveDateRange (Asia/Ho_Chi_Minh boundaries)", () => {
  it("today → ICT midnight..end of ICT day", () => {
    const { from, to } = resolveDateRange("today", undefined, undefined, NOW);
    expect(from?.toISOString()).toBe("2026-06-14T17:00:00.000Z"); // 2026-06-15 00:00 ICT
    expect(to?.toISOString()).toBe("2026-06-15T16:59:59.999Z"); // 2026-06-15 23:59:59.999 ICT
  });

  it("month → first ICT day of month..now end of day", () => {
    const { from, to } = resolveDateRange("month", undefined, undefined, NOW);
    expect(from?.toISOString()).toBe("2026-05-31T17:00:00.000Z"); // 2026-06-01 00:00 ICT
    expect(to?.toISOString()).toBe("2026-06-15T16:59:59.999Z");
  });

  it("last-month → previous ICT month span", () => {
    const { from, to } = resolveDateRange("last-month", undefined, undefined, NOW);
    expect(from?.toISOString()).toBe("2026-04-30T17:00:00.000Z"); // 2026-05-01 00:00 ICT
    expect(to?.toISOString()).toBe("2026-05-31T16:59:59.999Z"); // 2026-06-01 00:00 ICT − 1ms
  });

  it("custom → parses YYYY-MM-DD as ICT boundaries", () => {
    const { from, to } = resolveDateRange("custom", "2026-03-10", "2026-03-20", NOW);
    expect(from?.toISOString()).toBe("2026-03-09T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-03-20T16:59:59.999Z");
  });

  it("custom with no bounds → empty range", () => {
    expect(resolveDateRange("custom", undefined, undefined, NOW)).toEqual({});
  });
});
