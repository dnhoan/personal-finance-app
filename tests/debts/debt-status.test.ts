import { describe, expect, it } from "vitest";
import { debtStatus, debtPaidRatio } from "@/features/debts/lib/debt-status";

describe("debtStatus", () => {
  it("open when nothing paid (remaining == initial)", () => {
    expect(debtStatus(5_000_000, 5_000_000)).toBe("open");
  });

  it("partial when a payment lands just under initial", () => {
    expect(debtStatus(4_950_000, 5_000_000)).toBe("partial"); // 1% paid
  });

  it("partial mid-way", () => {
    expect(debtStatus(2_000_000, 5_000_000)).toBe("partial");
  });

  it("settled when remaining hits exactly zero", () => {
    expect(debtStatus(0, 5_000_000)).toBe("settled");
  });

  it("settled (clamped) when overpaid into the negative", () => {
    expect(debtStatus(-100_000, 5_000_000)).toBe("settled");
  });

  it("settled when initial is zero/invalid (owes nothing)", () => {
    expect(debtStatus(0, 0)).toBe("settled");
    expect(debtStatus(100, -1)).toBe("settled");
  });

  it("open when remaining somehow exceeds initial (no payments / overflow guard)", () => {
    expect(debtStatus(6_000_000, 5_000_000)).toBe("open");
  });
});

describe("debtPaidRatio", () => {
  it("0 when nothing paid", () => {
    expect(debtPaidRatio(5_000_000, 5_000_000)).toBe(0);
  });
  it("0.6 at 60% paid", () => {
    expect(debtPaidRatio(2_000_000, 5_000_000)).toBeCloseTo(0.6);
  });
  it("clamps to 1 when overpaid", () => {
    expect(debtPaidRatio(-1, 5_000_000)).toBe(1);
  });
  it("1 when initial is zero", () => {
    expect(debtPaidRatio(0, 0)).toBe(1);
  });
});
