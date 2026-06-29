import Link from "next/link";
import type { Route } from "next";

// Calm placeholder for first-run / no-data surfaces: an optional icon, a Fraunces
// headline, a muted explanatory line, and an optional CTA Link back to data entry.
// Replaces bare "Chưa có dữ liệu" sentences. Pure server component; the CTA meets
// the 44px touch-target floor. Pass `bare` to drop the card chrome when embedding
// inside an existing card (e.g. as a chart's empty body).
export function EmptyState({
  icon,
  title,
  description,
  cta,
  bare = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: { href: Route; label: string };
  bare?: boolean;
}) {
  const chrome = bare ? "" : "rounded-2xl border border-border bg-surface";
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-12 text-center ${chrome}`}>
      {icon ? (
        <span className="text-fg-subtle" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="text-xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </p>
      {description ? <p className="max-w-xs text-[13px] text-fg-muted">{description}</p> : null}
      {cta ? (
        <Link
          href={cta.href}
          className="mt-1 inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-fg transition-colors hover:opacity-90"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
