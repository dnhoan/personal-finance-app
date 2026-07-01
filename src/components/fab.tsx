"use client";
import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";

// Floating action button, fixed bottom-right above the mobile bottom-nav
// (safe-area respected). On desktop the nav is hidden so it sits lower.
//
// Two modes: pass `onClick` for a button (legacy sheet trigger) or `href` for a
// prefetched navigation (the /add capture route). `className` lets callers gate
// visibility per breakpoint (e.g. `hidden md:flex` for the desktop-only add FAB).
const FAB_CLASS = [
  "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full",
  "touch-manipulation [-webkit-tap-highlight-color:transparent]",
  "bg-primary text-primary-foreground transition-transform active:scale-95",
  "shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "bottom-[calc(env(safe-area-inset-bottom)+72px)] md:bottom-6",
].join(" ");

export function Fab({
  onClick,
  href,
  label = "Thêm giao dịch",
  className,
}: {
  onClick?: () => void;
  href?: Route;
  label?: string;
  className?: string;
}) {
  const cls = className ? `${FAB_CLASS} ${className}` : FAB_CLASS;

  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Plus size={24} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      <Plus size={24} aria-hidden="true" />
    </button>
  );
}
