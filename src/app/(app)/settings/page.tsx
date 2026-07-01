import type { Route } from "next";
import {
  Wallet,
  Tags,
  Repeat,
  Goal,
  HandCoins,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SettingsRow, type SettingsTint } from "@/features/settings/components/settings-row";
import { SettingsDownloadRow } from "@/features/settings/components/settings-download-row";
import { AccountHeroCard } from "@/features/settings/components/account-hero-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/auth-session";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Cài đặt · Personal Finance" };

type Row = {
  href: Route;
  label: string;
  description: string;
  icon: LucideIcon;
  tint: SettingsTint;
};

// Grouped settings sections. Account identity + Sign Out (formerly in the global
// TopBar) now live on this screen; new rows slot into the relevant group. Each
// row carries a one-line description + semantic tint so the list scans quickly.
const GROUPS: { label: string; rows: Row[] }[] = [
  {
    label: "Tài chính",
    rows: [
      {
        href: "/accounts",
        label: "Tài khoản",
        description: "Ví, số dư và loại tài khoản",
        icon: Wallet,
        tint: "navy",
      },
      {
        href: "/goals" as Route,
        label: "Mục tiêu",
        description: "Theo dõi tiến độ tiết kiệm",
        icon: Goal,
        tint: "sage",
      },
      {
        href: "/debts" as Route,
        label: "Nợ & Vay",
        description: "Khoản vay và cho vay",
        icon: HandCoins,
        tint: "amber",
      },
    ],
  },
  {
    label: "Thiết lập",
    rows: [
      {
        href: "/settings/categories" as Route,
        label: "Danh mục",
        description: "Nhóm thu chi của bạn",
        icon: Tags,
        tint: "navy",
      },
      {
        href: "/settings/recurring" as Route,
        label: "Định kỳ",
        description: "Giao dịch lặp lại tự động",
        icon: Repeat,
        tint: "sage",
      },
    ],
  },
];

export default async function SettingsPage() {
  const { user } = await requireSession();

  return (
    <div className="flex flex-col gap-7">
      <header className={ENTER}>
        <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
          Cài đặt
        </h1>
        <p className="mt-1 text-sm text-fg-muted">Tài khoản, thiết lập và dữ liệu</p>
      </header>

      <div className={ENTER} style={enterDelay(60)}>
        <AccountHeroCard email={user.email} />
      </div>

      {GROUPS.map((group, i) => (
        <section
          key={group.label}
          className={`flex flex-col gap-2.5 ${ENTER}`}
          style={enterDelay(120 + i * 60)}
        >
          <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {group.label}
          </h2>
          <Card className="overflow-hidden p-0">
            {group.rows.map((row) => (
              <SettingsRow
                key={row.label}
                href={row.href}
                label={row.label}
                description={row.description}
                icon={row.icon}
                tint={row.tint}
              />
            ))}
          </Card>
        </section>
      ))}

      {/* Data export. Download rows fetch the attachment from the API route and
          save it; the server-set Content-Disposition filename wins. */}
      <section className={`flex flex-col gap-2.5 ${ENTER}`} style={enterDelay(240)}>
        <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
          Dữ liệu
        </h2>
        <Card className="overflow-hidden p-0">
          <SettingsDownloadRow
            href="/api/export/csv?entity=transactions"
            label="Xuất giao dịch"
            description="Mở bằng Excel hoặc Google Sheets (CSV)"
            icon={FileSpreadsheet}
            tint="green"
          />
        </Card>
      </section>

      <section className={`flex flex-col gap-4 ${ENTER}`} style={enterDelay(300)}>
        <SignOutButton />
        <p className="text-center text-xs text-fg-subtle">Tài chính Cá nhân · v1.0</p>
      </section>
    </div>
  );
}
