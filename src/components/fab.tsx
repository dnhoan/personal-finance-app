"use client";
import { Plus } from "lucide-react";

// Floating action button, fixed bottom-right above the mobile bottom-nav
// (safe-area respected). On desktop the nav is hidden so it sits lower.
export function Fab({
  onClick,
  label = "Thêm giao dịch",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full",
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        "bg-primary text-primary-foreground transition-transform active:scale-95",
        "shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "bottom-[calc(env(safe-area-inset-bottom)+72px)] md:bottom-6",
      ].join(" ")}
    >
      <Plus size={24} aria-hidden="true" />
    </button>
  );
}
