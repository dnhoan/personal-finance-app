import { requireSession } from "@/lib/auth-session";
import { env } from "@/lib/env";
import { getBankSyncSettings, listLinkableAccounts } from "@/features/bank-sync/queries";
import { getBalanceDrift } from "@/features/bank-sync/balance-drift";
import { BankSyncSetupCard } from "@/features/bank-sync/components/bank-sync-setup-card";
import { BackLink } from "@/components/app-shell/back-link";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Liên kết ngân hàng · Personal Finance" };

// Self-service setup for SePay bank sync. The webhook URL is derived from the
// configured app URL rather than the request, so the value the user copies is
// the deployed origin even when the page is opened over a preview host.
export default async function BankSyncSettingsPage() {
  const { user } = await requireSession();

  const [settings, linkableAccounts, drifts] = await Promise.all([
    getBankSyncSettings(user.id),
    listLinkableAccounts(user.id),
    getBalanceDrift(user.id),
  ]);

  const webhookUrl = new URL("/api/webhooks/sepay", env.NEXT_PUBLIC_APP_URL).toString();

  return (
    <div className="flex flex-col gap-7">
      <header className={ENTER}>
        <BackLink href="/settings" label="Liên kết ngân hàng" />
        <p className="mt-1 text-sm text-fg-muted">
          Tự động ghi giao dịch từ ngân hàng qua SePay. Giao dịch về sẽ chờ bạn chọn danh mục.
        </p>
      </header>

      <div className={ENTER} style={enterDelay(60)}>
        <BankSyncSetupCard
          webhookUrl={webhookUrl}
          token={settings.token}
          links={settings.links}
          drifts={drifts}
          linkableAccounts={linkableAccounts}
        />
      </div>
    </div>
  );
}
