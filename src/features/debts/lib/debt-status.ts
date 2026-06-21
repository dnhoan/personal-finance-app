// Debt/receivable lifecycle, computed purely from the running balance — no stored
// status column, so a back-dated or deleted payment always re-derives correctly.
//
//   open     — nothing settled yet (remaining == initial)
//   partial  — some but not all settled (0 < remaining < initial)
//   settled  — fully cleared, possibly overshot (remaining <= 0)
//
// `remaining` and `initial` are both magnitudes (whole VND, >= 0). Direction
// (you-owe vs owed-to-you) is carried by the account type, not by sign here, so
// this helper is identical for both: remaining counts down from initial toward 0
// as expense (debt) or income (receivable) payments accrue.

export type DebtStatus = "open" | "partial" | "settled";

export function debtStatus(remaining: number, initial: number): DebtStatus {
  // A zero/negative initial owes nothing — treat as already settled.
  if (initial <= 0) return "settled";
  if (remaining <= 0) return "settled";
  if (remaining >= initial) return "open";
  return "partial";
}

/** Settled fraction in [0,1] for the progress bar (paid / initial, clamped). */
export function debtPaidRatio(remaining: number, initial: number): number {
  if (initial <= 0) return 1;
  const paid = initial - Math.max(0, remaining);
  return Math.min(1, Math.max(0, paid / initial));
}
