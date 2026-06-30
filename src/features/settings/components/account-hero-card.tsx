import { BadgeCheck } from "lucide-react";

// The account identity, styled as a deep-navy "membership card" — the page's
// signature element. Colors are intentionally hardcoded (not theme tokens):
// this is a constant-identity object, like a physical bank card, so it stays
// the same deep navy in both light and dark mode instead of flipping with the
// theme's primary token.
export function AccountHeroCard({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,#2e3a59_0%,#243150_55%,#1c2740_100%)] p-5 shadow-sm">
      {/* Soft radial highlight + faint grid for depth, kept low-contrast so the
          text stays the focus. Decorative only. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#7ba686]/20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold text-[#faf8f5] ring-1 ring-white/20"
          style={{ fontFamily: "var(--font-serif)" }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
            Tài khoản
          </p>
          <p className="truncate text-[15px] font-semibold text-[#faf8f5]" translate="no">
            {email}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1.5 pr-2.5 text-[11px] font-medium text-white/85 ring-1 ring-white/10">
            <BadgeCheck size={14} className="text-[#a8d5b5]" aria-hidden="true" />
            Đã xác minh
          </span>
        </div>
      </div>
    </div>
  );
}
