import { describe, expect, it } from "vitest";
import {
  effectiveBudget,
  rolloverDelta,
  budgetStatus,
} from "@/features/budgets/lib/effective-budget";

describe("effectiveBudget", () => {
  it("no prior budget → just the current amount", () => {
    expect(effectiveBudget({ amount: 1_000_000, rollover: true }, null)).toBe(1_000_000);
  });

  it("rollover off → ignores prior leftover", () => {
    expect(
      effectiveBudget({ amount: 1_000_000, rollover: false }, { amount: 800_000, spent: 200_000 }),
    ).toBe(1_000_000);
  });

  it("rollover on + prior underspent → carries positive leftover", () => {
    expect(
      effectiveBudget({ amount: 1_000_000, rollover: true }, { amount: 800_000, spent: 300_000 }),
    ).toBe(1_500_000); // +500k leftover
  });

  it("rollover on + prior overspent → no negative carry", () => {
    expect(
      effectiveBudget({ amount: 1_000_000, rollover: true }, { amount: 800_000, spent: 900_000 }),
    ).toBe(1_000_000);
  });

  it("rollover on + prior exactly spent → no change", () => {
    expect(
      effectiveBudget({ amount: 1_000_000, rollover: true }, { amount: 800_000, spent: 800_000 }),
    ).toBe(1_000_000);
  });

  it("rolloverDelta exposes the carried amount", () => {
    expect(
      rolloverDelta({ amount: 1_000_000, rollover: true }, { amount: 800_000, spent: 300_000 }),
    ).toBe(500_000);
    expect(
      rolloverDelta({ amount: 1_000_000, rollover: false }, { amount: 800_000, spent: 300_000 }),
    ).toBe(0);
  });
});

describe("budgetStatus", () => {
  it("under below 80%", () => {
    expect(budgetStatus(500_000, 1_000_000)).toBe("under");
  });
  it("approaching 80–100%", () => {
    expect(budgetStatus(800_000, 1_000_000)).toBe("approaching");
    expect(budgetStatus(1_000_000, 1_000_000)).toBe("approaching");
  });
  it("over above 100%", () => {
    expect(budgetStatus(1_000_001, 1_000_000)).toBe("over");
  });
  it("zero effective amount with spend is over", () => {
    expect(budgetStatus(1, 0)).toBe("over");
    expect(budgetStatus(0, 0)).toBe("under");
  });
});
