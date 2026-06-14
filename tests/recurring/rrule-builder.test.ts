import { describe, expect, it } from "vitest";
import {
  buildRruleString,
  parseRruleString,
  describeRrule,
  nextOccurrences,
  anchorToVnDate,
  type RruleBuilderState,
} from "@/features/recurring/lib/rrule-builder";

// Eight common patterns. Roundtrip stability: build → parse → build yields the
// same canonical string (and parse never fails for a pattern the builder emits).
const PATTERNS: { name: string; state: RruleBuilderState }[] = [
  { name: "daily", state: s({ freq: "DAILY" }) },
  { name: "every 3 days", state: s({ freq: "DAILY", interval: 3 }) },
  { name: "weekly Mon", state: s({ freq: "WEEKLY", byWeekday: [0] }) },
  { name: "weekly Mon+Wed+Fri", state: s({ freq: "WEEKLY", byWeekday: [0, 2, 4] }) },
  { name: "fortnightly Tue", state: s({ freq: "WEEKLY", interval: 2, byWeekday: [1] }) },
  { name: "monthly day 1", state: s({ freq: "MONTHLY", byMonthDay: 1 }) },
  { name: "every 6 months day 15", state: s({ freq: "MONTHLY", interval: 6, byMonthDay: 15 }) },
  { name: "yearly", state: s({ freq: "YEARLY" }) },
];

function s(over: Partial<RruleBuilderState>): RruleBuilderState {
  return {
    freq: "MONTHLY",
    interval: 1,
    byWeekday: [],
    byMonthDay: null,
    startDate: "2026-01-15",
    ...over,
  };
}

describe("rrule-builder roundtrip", () => {
  for (const { name, state } of PATTERNS) {
    it(`is stable for ${name}`, () => {
      const first = buildRruleString(state);
      const parsed = parseRruleString(first);
      expect(parsed).not.toBeNull();
      const second = buildRruleString(parsed!);
      expect(second).toBe(first);
    });
  }
});

describe("describeRrule (Vietnamese)", () => {
  it("describes common cadences", () => {
    expect(describeRrule(buildRruleString(s({ freq: "DAILY" })))).toBe("Hàng ngày");
    expect(describeRrule(buildRruleString(s({ freq: "MONTHLY", byMonthDay: 1 })))).toBe(
      "Hàng tháng · ngày 1",
    );
    expect(
      describeRrule(buildRruleString(s({ freq: "MONTHLY", interval: 6, byMonthDay: 15 }))),
    ).toBe("6 tháng một lần · ngày 15");
    expect(describeRrule(buildRruleString(s({ freq: "YEARLY" })))).toBe("Hàng năm");
  });

  it("falls back to 'Tùy chỉnh' for unparseable input", () => {
    expect(describeRrule("not-an-rrule")).toBe("Tùy chỉnh");
  });
});

describe("occurrence anchoring", () => {
  it("emits noon-UTC anchors whose VN date matches the schedule", () => {
    const rrule = buildRruleString(s({ freq: "MONTHLY", byMonthDay: 1, startDate: "2026-01-01" }));
    const dates = nextOccurrences(rrule, 3, new Date("2026-01-10T00:00:00Z"));
    expect(dates).toHaveLength(3);
    for (const d of dates) {
      expect(d.getUTCHours()).toBe(12); // 12:00 UTC = 19:00 ICT, same VN day
    }
    expect(dates.map(anchorToVnDate)).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
  });
});
