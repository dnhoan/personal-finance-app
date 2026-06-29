"use client";
import * as React from "react";
import { LogOut } from "lucide-react";
import { signOutWithCacheClear } from "@/lib/auth-client";

// Full-width Sign Out row for the Settings footer. Same session-exit path as the
// old TopBar dropdown item (signOutWithCacheClear clears caches then redirects),
// rendered as a danger-tinted card button instead of a menu item.
export function SignOutButton() {
  const [pending, setPending] = React.useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOutWithCacheClear();
      }}
      className="flex min-h-[64px] w-full border border-border touch-manipulation items-center gap-3 rounded-lg bg-card p-4 text-left text-danger shadow-sm transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-expense-soft text-danger">
        <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 font-medium">
        {pending ? "Đang đăng xuất…" : "Đăng xuất"}
      </span>
    </button>
  );
}
