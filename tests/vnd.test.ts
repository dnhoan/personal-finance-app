import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseVnd, formatVnd } from "@/lib/vnd";

describe("parseVnd — suffixes", () => {
  it.each([
    ["50k", 50_000],
    ["50K", 50_000],
    ["1tr", 1_000_000],
    ["1.5tr", 1_500_000],
    ["1,5tr", 1_500_000],
    ["2tỷ", 2_000_000_000],
    ["2 tỷ", 2_000_000_000],
    ["2ty", 2_000_000_000],
    ["3chục", 30],
    ["3 chục", 30],
    ["3 chuc", 30],
    ["0,5tr", 500_000],
  ])("parses %s → %d", (input, expected) => {
    expect(parseVnd(input)).toBe(expected);
  });
});

describe("parseVnd — bare numbers (thousands/decimal disambiguation)", () => {
  it.each([
    ["50000", 50_000],
    ["50.000", 50_000],
    ["1.500.000", 1_500_000],
    ["1,500", 1_500],
    ["1.234.567", 1_234_567],
    ["0", 0],
    ["999999999999", 999_999_999_999],
  ])("parses %s → %d", (input, expected) => {
    expect(parseVnd(input)).toBe(expected);
  });
});

describe("parseVnd — composites", () => {
  it.each([
    ["1tr500k", 1_500_000],
    ["50k500", 50_500],
    ["1tr5k", 1_005_000],
    ["2tr50k500", 2_050_500],
  ])("parses %s → %d", (input, expected) => {
    expect(parseVnd(input)).toBe(expected);
  });
});

describe("parseVnd — rejects (null)", () => {
  it.each([
    ["", "empty"],
    ["   ", "whitespace only"],
    ["1.5", "bare single separator, RHS≠3 digits (ambiguous)"],
    ["1.50", "bare single separator, RHS 2 digits (ambiguous)"],
    ["-50k", "negative sign"],
    ["1e6", "scientific notation"],
    ["1tr.5k", "portion starts with separator"],
    ["k", "suffix with no number"],
    ["tr500", "leading suffix"],
    ["1,5555k", "non-integer result"],
    ["abc", "letters"],
    ["1.50.000", "malformed thousands grouping"],
    ["50.0000", "RHS 4 digits"],
    ["1.000.000.000.000", "exceeds max"],
  ])("rejects %s (%s)", (input) => {
    expect(parseVnd(input)).toBeNull();
  });
});

describe("parseVnd — fuzz (ReDoS / crash safety)", () => {
  it("never throws and only returns null or a whole VND in range", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (s) => {
        const out = parseVnd(s);
        if (out !== null) {
          expect(Number.isInteger(out)).toBe(true);
          expect(out).toBeGreaterThanOrEqual(0);
          expect(out).toBeLessThanOrEqual(999_999_999_999);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it("handles adversarial repeated separators/suffixes without hanging", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9.,ktr]{0,30}$/), (s) => {
        expect(() => parseVnd(s)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });
});

describe("formatVnd", () => {
  it("formats whole VND with period thousands + ₫ suffix, no decimals", () => {
    // Intl uses a non-breaking space before ₫; assert on the digit grouping + glyph.
    expect(formatVnd(50_000).replace(/ /g, " ")).toBe("50.000 ₫");
    expect(formatVnd(2_450_000).replace(/ /g, " ")).toBe("2.450.000 ₫");
    expect(formatVnd(0).replace(/ /g, " ")).toBe("0 ₫");
  });

  it("round-trips formatVnd-able values through parseVnd", () => {
    for (const n of [1000, 50_000, 1_500_000, 2_000_000_000]) {
      // The dotted thousands form parses back to the same integer.
      const dotted = n.toLocaleString("vi-VN");
      expect(parseVnd(dotted)).toBe(n);
    }
  });
});
