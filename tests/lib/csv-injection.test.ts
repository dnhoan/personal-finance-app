import { describe, expect, it } from "vitest";
import { csvEscapeCell } from "@/lib/csv-escape";

describe("csvEscapeCell — formula-injection lead chars", () => {
  // Each dangerous lead char must be quote-prefixed so the spreadsheet treats the
  // cell as text. Output is then RFC-4180 quoted, so we assert the inner content.
  it.each([
    ["=cmd|' /c calc'!A1", "'=cmd|' /c calc'!A1"],
    ["+1+2", "'+1+2"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tlead-tab", "'\tlead-tab"],
    ["\rlead-cr", "'\rlead-cr"],
  ])("prefixes %j with a single quote", (input, innerExpected) => {
    expect(csvEscapeCell(input)).toBe(`"${innerExpected}"`);
  });
});

describe("csvEscapeCell — RFC-4180 quoting", () => {
  it("wraps plain text in double quotes", () => {
    expect(csvEscapeCell("Cà phê")).toBe('"Cà phê"');
  });

  it("doubles embedded double quotes", () => {
    expect(csvEscapeCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("keeps embedded commas inside one field", () => {
    expect(csvEscapeCell("a,b,c")).toBe('"a,b,c"');
  });

  it("keeps embedded newlines inside one field", () => {
    expect(csvEscapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("combines formula-prefix with quote-doubling", () => {
    expect(csvEscapeCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
  });
});

describe("csvEscapeCell — nullish + coercion", () => {
  it("renders null/undefined as an empty quoted cell", () => {
    expect(csvEscapeCell(null)).toBe('""');
    expect(csvEscapeCell(undefined)).toBe('""');
  });

  it("coerces numbers to text", () => {
    expect(csvEscapeCell(50000)).toBe('"50000"');
  });
});
