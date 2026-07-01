"use client";
import { Toaster as SonnerToaster } from "sonner";

// App-wide toast host. Themed to the app's surface/border tokens (works in both
// light and dark via the CSS vars) and positioned below the top safe-area inset.
// Sonner renders an aria-live region for SR feedback and respects
// prefers-reduced-motion out of the box.
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors={false}
      offset="calc(env(safe-area-inset-top) + 16px)"
      // A modal Radix dialog (our bottom Sheet) sets `pointer-events: none` on
      // the body while open. Discard-confirmation toasts fire from those sheets
      // while they stay open, so without this the toast's action button would
      // inherit the disabled pointer events and be unclickable.
      style={{ pointerEvents: "auto" }}
      toastOptions={{
        style: {
          background: "var(--color-surface)",
          color: "var(--color-fg)",
          border: "1px solid var(--color-border)",
        },
        actionButtonStyle: {
          background: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        },
      }}
    />
  );
}
