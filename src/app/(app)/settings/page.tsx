import Link from "next/link";
import { Wallet, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Thêm · Personal Finance" };

// Settings index: a list of navigation rows. For MVP it holds one live entry
// (Accounts) — the only persistent path to the orphaned /accounts screen. Future
// rows (categories, export, telegram) slot in here without re-routing.
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Thêm
      </h1>

      <ul className="flex flex-col gap-2">
        <li>
          <Link href="/accounts" aria-label="Tài khoản">
            <Card className="flex min-h-[64px] items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
                <Wallet size={20} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 font-medium text-fg">Tài khoản</span>
              <ChevronRight size={20} className="shrink-0 text-fg-subtle" aria-hidden="true" />
            </Card>
          </Link>
        </li>
      </ul>
    </div>
  );
}
