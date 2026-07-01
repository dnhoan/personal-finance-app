// Pure integer-VND state machine behind the /add numeric keypad. No React, no
// regex — a tiny arithmetic reducer over the current whole-VND amount. Every path
// clamps to MAX_VND and stays an integer, so a user mashing keys can never
// overflow, wrap, or produce a fractional dong.

export const MAX_VND = 999_999_999_999;

export type KeyAction =
  | { type: "digit"; d: number } // 0-9 appended as the next low-order digit
  | { type: "zeros"; n: number } // fast trailing zeros ("000" → n=3)
  | { type: "backspace" } // drop the last digit
  | { type: "clear" } // reset to 0
  | { type: "mult"; factor: number } // ×1.000 / ×1.000.000 shortcut keys
  | { type: "add"; delta: number }; // preset chips (+10k, +50k, +100k)

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), MAX_VND);
}

export function reduceAmount(cur: number, action: KeyAction): number {
  const base = clamp(cur);
  switch (action.type) {
    case "digit": {
      if (action.d < 0 || action.d > 9) return base;
      return clamp(base * 10 + action.d);
    }
    case "zeros": {
      // No-op at 0 so a leading "000" can't inflate an empty amount.
      if (base === 0) return 0;
      return clamp(base * 10 ** action.n);
    }
    case "mult": {
      // No-op at 0 — ×1k on an empty amount is meaningless, not "1.000".
      if (base === 0) return 0;
      return clamp(base * action.factor);
    }
    case "add":
      return clamp(base + action.delta);
    case "backspace":
      return Math.floor(base / 10);
    case "clear":
      return 0;
    default:
      return base;
  }
}
