"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, Target, Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Routes beyond /dashboard 404 until their phases land — acceptable for now.
// Cast to Route because typedRoutes can't yet resolve the not-built paths.
const TABS: { href: Route; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard" as Route, label: "Trang chủ", icon: Home },
  { href: "/transactions" as Route, label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/budgets" as Route, label: "Ngân sách", icon: Target },
  { href: "/settings" as Route, label: "Thêm", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-fg-subtle",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
