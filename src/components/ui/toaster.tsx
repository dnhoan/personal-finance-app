"use client";
import { Toaster as SonnerToaster } from "sonner";

// App-wide toast host. Themed to the app's surface/border tokens (works in both
// light and dark via the CSS vars) and positioned above the mobile bottom-nav
// with a safe-area offset. Sonner renders an aria-live region for SR feedback
// and respects prefers-reduced-motion out of the box.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      richColors={false}
      offset="calc(env(safe-area-inset-bottom) + 72px)"
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
