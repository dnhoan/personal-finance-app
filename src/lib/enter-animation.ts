import type { CSSProperties } from "react";

// Shared section-entrance animation for top-level page sections: a gentle
// staggered rise on load. `fill-mode-both` holds the pre-animation (hidden) state
// so nothing flashes before its turn; `motion-reduce:animate-none` drops the
// motion entirely for users who ask. Powered by tw-animate-css utilities.
//
// Usage: add `ENTER` to a section's className and stagger siblings with
// `style={enterDelay(60)}`. First section needs no delay.
export const ENTER =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none";

// Sections are authored with a nominal 60ms stagger (60, 120, 180…). We render at
// this fraction for a snappier cascade — the first section lands ~30ms — without
// re-tuning every call site. Lower it to speed the whole app's reveal at once.
const STAGGER_SCALE = 0.5;

/** Inline style that delays a section's reveal so siblings cascade in. */
export function enterDelay(ms: number): CSSProperties {
  return { animationDelay: `${Math.round(ms * STAGGER_SCALE)}ms` };
}
