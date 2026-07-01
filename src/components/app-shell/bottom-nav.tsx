"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, Target, Settings, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// All four tabs now resolve under typedRoutes (their pages exist), so no casts.
const TABS: { href: Route; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Trang chủ", icon: Home },
  { href: "/transactions", label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

// The add button is docked in the middle: two tabs sit left of it, two right.
const LEFT_TABS = TABS.slice(0, 2);
const RIGHT_TABS = TABS.slice(2);

export function BottomNav() {
  const pathname = usePathname();

  // The /add capture screen is full-height and owns its own close affordance; the
  // nav (and its docked add button) would collide with the keypad, so hide it there.
  if (pathname === "/add") return null;

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {LEFT_TABS.map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}

        {/* Docked center add button — raised above the bar, links to the capture
            route. Not a tab, so no aria-current; carries its own label. */}
        <li className="flex w-16 shrink-0 items-start justify-center">
          <Link
            href={"/add" as Route}
            aria-label="Thêm giao dịch"
            className={cn(
              "-mt-5 flex h-14 w-14 items-center justify-center rounded-full",
              "touch-manipulation [-webkit-tap-highlight-color:transparent]",
              "bg-primary text-primary-foreground",
              "shadow-[0_4px_12px_rgba(27,29,35,0.12),0_1px_3px_rgba(27,29,35,0.08)]",
              "transition-transform duration-100 active:scale-95 motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Plus size={26} aria-hidden="true" />
          </Link>
        </li>

        {RIGHT_TABS.map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}

function NavTab({
  tab: { href, label, icon: Icon },
  pathname,
}: {
  tab: { href: Route; label: string; icon: LucideIcon };
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium",
          "touch-manipulation [-webkit-tap-highlight-color:transparent]",
          // Instant finger-down feedback: the tab dims + nudges down on
          // press (hover never fires on touch), then the route's
          // loading.tsx skeleton covers the content wait.
          "transition-[transform,color] duration-100 active:scale-95 active:text-primary motion-reduce:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          active ? "text-primary" : "text-fg-subtle hover:text-fg",
        )}
      >
        <Icon size={22} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
        {label}
      </Link>
    </li>
  );
}
