"use client";
import { useCallback, useEffect, useState } from "react";

// Per-device "has the user seen the first-run welcome" flag. localStorage, not
// the DB, by design (KISS): no migration, no server round-trip. Tradeoff — it
// re-shows on a new device/browser, accepted for a low-stakes welcome.
const WELCOME_SEEN_KEY = "pf.welcome-seen.v1";

// Pure storage helpers (no React) so they unit-test in the node env by stubbing
// globalThis.localStorage — avoids pulling in jsdom just for one flag.

/** Reads the flag. Fail-closed: any storage error → treated as already seen, so
 *  a broken/disabled storage never loops the dialog. */
export function readWelcomeSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

/** Persists that the welcome has been seen. Silently ignores storage errors. */
export function markWelcomeSeen(): void {
  try {
    globalThis.localStorage?.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // Storage unavailable (Safari private mode / disabled) — nothing to persist.
  }
}

/** Tri-state welcome flag. `seen === null` means "not yet determined" (pre-mount)
 *  so the dialog never flashes during hydration; the effect resolves it after
 *  mount. `markSeen` persists and flips the state. */
export function useWelcomeSeen(): { seen: boolean | null; markSeen: () => void } {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    setSeen(readWelcomeSeen());
  }, []);

  const markSeen = useCallback(() => {
    markWelcomeSeen();
    setSeen(true);
  }, []);

  return { seen, markSeen };
}
