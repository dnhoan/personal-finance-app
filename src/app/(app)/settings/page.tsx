import type { Route } from "next";
import {
  Wallet,
  Tags,
  Repeat,
  Flag,
  HandCoins,
  BadgeCheck,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SettingsRow } from "@/features/settings/components/settings-row";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/auth-session";

export const metadata = { title: "Thêm · Personal Finance" };

type Row = { href: Route; label: string; icon: LucideIcon };

// Grouped settings sections. Account identity + Sign Out (formerly in the global
// TopBar) now live on this screen; new rows slot into the relevant group.
const GROUPS: { label: string; rows: Row[] }[] = [
  {
    label: "Tài chính",
    rows: [
      { href: "/accounts", label: "Tài khoản", icon: Wallet },
      { href: "/goals" as Route, label: "Mục tiêu", icon: Flag },
      { href: "/debts" as Route, label: "Nợ & Vay", icon: HandCoins },
    ],
  },
  {
    label: "Thiết lập",
    rows: [
      { href: "/settings/categories" as Route, label: "Danh mục", icon: Tags },
      { href: "/settings/recurring" as Route, label: "Định kỳ", icon: Repeat },
      { href: "/settings/email-alerts" as Route, label: "Email", icon: Mail },
    ],
  },
];

export default async function SettingsPage() {
  const { user } = await requireSession();
  const email = user.email;
  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Thêm
      </h1>

      {/* Account header — identity that used to sit in the TopBar avatar. */}
      <Card className="flex items-center gap-4 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            Tài khoản
          </p>
          <p className="truncate font-semibold text-fg" translate="no">
            {email}
          </p>
        </div>
        <BadgeCheck size={20} className="shrink-0 text-accent" aria-hidden="true" />
      </Card>

      {GROUPS.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {group.label}
          </h2>
          <Card className="overflow-hidden p-0">
            {group.rows.map((row) => (
              <SettingsRow key={row.label} href={row.href} label={row.label} icon={row.icon} />
            ))}
          </Card>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <SignOutButton />
        <p className="text-center text-xs text-fg-subtle">Tài chính Cá nhân · v1.0</p>
      </section>
    </div>
  );
}
