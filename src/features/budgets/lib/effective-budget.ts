// Rollover-adjusted budget. When a category's budget has rollover enabled and
// the PRIOR month was underspent, the unspent remainder carries into this month:
//
//   effective = amount + max(0, priorAmount − priorSpent)
//
// Only a positive remainder carries (an overspent prior month does NOT reduce
// this month — the design choice keeps rollover encouraging, not punishing).
// With rollover off, or no prior budget, the effective amount is just `amount`.

export type CurrentBudget = { amount: number; rollover: boolean };
export type PriorBudget = { amount: number; spent: number } | null;

export function effectiveBudget(current: CurrentBudget, prior: PriorBudget): number {
  if (!current.rollover || prior === null) return current.amount;
  const leftover = prior.amount - prior.spent;
  return leftover > 0 ? current.amount + leftover : current.amount;
}

/** Rolled-over delta (≥0) added on top of `amount`, for explicit UI display. */
export function rolloverDelta(current: CurrentBudget, prior: PriorBudget): number {
  return effectiveBudget(current, prior) - current.amount;
}

export type BudgetStatus = "under" | "approaching" | "over";

// under (<80%), approaching (80–100%), over (>100%). Spending past the effective
// amount is `over`; a zero/empty effective amount with any spend is also `over`.
export function budgetStatus(spent: number, effectiveAmount: number): BudgetStatus {
  if (spent > effectiveAmount) return "over";
  if (effectiveAmount <= 0) return spent > 0 ? "over" : "under";
  return spent / effectiveAmount >= 0.8 ? "approaching" : "under";
}
