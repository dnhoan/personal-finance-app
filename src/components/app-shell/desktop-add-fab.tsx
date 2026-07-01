"use client";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Fab } from "@/components/fab";

// Desktop add entry point. On mobile the bottom nav carries a docked center add
// button; the nav is `md:hidden`, so desktop needs its own affordance — this FAB,
// shown only at `md+`. Hidden on /add itself (you're already adding there).
export function DesktopAddFab() {
  const pathname = usePathname();
  if (pathname === "/add") return null;
  return <Fab href={"/add" as Route} className="hidden md:flex" />;
}
