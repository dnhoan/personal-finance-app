import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";

// Reusable "back" link whose label is the *current* page's title — the chevron
// doubles as the header heading, so sub-pages drop their <h1>. `href` points at
// the parent (e.g. /settings); the bottom nav only exposes top-level routes.
export function BackLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-1.5 flex w-fit items-center gap-1 text-2xl font-semibold text-fg hover:text-fg-muted"
      style={{ fontFamily: "var(--font-serif)" }}
    >
      <ChevronLeft size={26} strokeWidth={2} aria-hidden="true" className="shrink-0" /> {label}
    </Link>
  );
}

// Header row for sub-pages: back-link-as-title on the left, optional action
// (e.g. an Add button) on the right of the same row — see the settings sub-pages.
export function PageHeader({
  href,
  label,
  action,
}: {
  href: Route;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <BackLink href={href} label={label} />
      {action}
    </div>
  );
}
