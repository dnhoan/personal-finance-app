import { describe, it, expect } from "vitest";
import { reduceAmount, MAX_VND } from "@/features/transactions/lib/amount-keypad-reducer";

const digit = (d: number) => ({ type: "digit", d }) as const;

describe("reduceAmount", () => {
  it("chains digits into a whole number", () => {
    let n = 0;
    for (const d of [5, 0, 0]) n = reduceAmount(n, digit(d));
    expect(n).toBe(500);
  });

  it("ignores out-of-range digits", () => {
    expect(reduceAmount(5, digit(10))).toBe(5);
    expect(reduceAmount(5, digit(-1))).toBe(5);
  });

  it("zeros is a no-op at 0 but scales a non-zero amount", () => {
    expect(reduceAmount(0, { type: "zeros", n: 3 })).toBe(0);
    expect(reduceAmount(50, { type: "zeros", n: 3 })).toBe(50_000);
  });

  it("mult is a no-op at 0 and scales otherwise", () => {
    expect(reduceAmount(0, { type: "mult", factor: 1_000 })).toBe(0);
    expect(reduceAmount(50, { type: "mult", factor: 1_000 })).toBe(50_000);
    expect(reduceAmount(2, { type: "mult", factor: 1_000_000 })).toBe(2_000_000);
  });

  it("adds preset deltas", () => {
    expect(reduceAmount(0, { type: "add", delta: 10_000 })).toBe(10_000);
    expect(reduceAmount(40_000, { type: "add", delta: 10_000 })).toBe(50_000);
  });

  it("backspace drops the last digit down to 0", () => {
    expect(reduceAmount(509, { type: "backspace" })).toBe(50);
    expect(reduceAmount(5, { type: "backspace" })).toBe(0);
    expect(reduceAmount(0, { type: "backspace" })).toBe(0);
  });

  it("clear resets to 0", () => {
    expect(reduceAmount(123_456, { type: "clear" })).toBe(0);
  });

  it("clamps at MAX_VND without wrapping", () => {
    expect(reduceAmount(MAX_VND, digit(9))).toBe(MAX_VND);
    let n = MAX_VND;
    for (let i = 0; i < 5; i++) n = reduceAmount(n, { type: "mult", factor: 1_000_000 });
    expect(n).toBe(MAX_VND);
    expect(reduceAmount(MAX_VND, { type: "add", delta: 10_000 })).toBe(MAX_VND);
  });

  it("normalises a malformed current value to a clamped integer", () => {
    expect(reduceAmount(-5, digit(1))).toBe(1);
    expect(reduceAmount(12.9, { type: "backspace" })).toBe(1);
  });
});
