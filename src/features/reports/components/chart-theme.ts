// Shared chart theming constants for Recharts client components. Colors are
// passed as CSS-variable references (NOT Tailwind classes) into SVG stroke/fill
// props so they resolve at paint time and re-resolve under dark mode — the
// design tokens live in @theme as `--color-*`, so dark mode flips them for free.
//
// Inline `var(--color-*)` is required because Recharts paints raw SVG internals
// that Tailwind utility classes don't reach.

export const CHART_COLORS = {
  income: "var(--color-income)",
  expense: "var(--color-expense)",
  net: "var(--color-accent)",
  axis: "var(--color-fg-subtle)",
  grid: "var(--color-border)",
} as const;

// Compact VND label for chart axes/tooltips ("1,5 tr", "92,5 tr", "1,2 tỷ").
// Keeps ticks short where full `formatVnd` would overflow a 360px-wide chart.
export function compactVnd(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n);
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)} tr`;
  if (abs >= 1_000) return `${sign}${fmt(abs / 1_000)} k`;
  return `${sign}${fmt(abs)}`;
}

// Recharts honours animationDuration; 0 disables motion. Read once at render so a
// reduced-motion preference suppresses the draw-in animation.
export function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
