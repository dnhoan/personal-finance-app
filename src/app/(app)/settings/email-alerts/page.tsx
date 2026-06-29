import { BadgeCheck, CircleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-session";
import { env } from "@/lib/env";

export const metadata = { title: "Email · Personal Finance" };

// Env-derived status. "Configured" means the SMTP key + destination are present,
// so the daily renewal cron can actually deliver. Pure read — no DB, no secrets
// rendered (only the destination address, which the owner already knows).
export default async function EmailAlertsPage() {
  await requireSession();

  const configured = Boolean(env.BREVO_SMTP_KEY && env.ALERT_TO_EMAIL);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Email nhắc nhở
      </h1>

      <Card className="flex items-center gap-4 p-4">
        {configured ? (
          <BadgeCheck size={24} className="shrink-0 text-accent" aria-hidden="true" />
        ) : (
          <CircleAlert size={24} className="shrink-0 text-fg-subtle" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{configured ? "Đã thiết lập" : "Chưa thiết lập"}</p>
          {configured && (
            <p className="truncate text-sm text-fg-muted" translate="no">
              Gửi tới {env.ALERT_TO_EMAIL}
            </p>
          )}
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          Thiết lập Brevo SMTP
        </h2>
        <Card className="flex flex-col gap-3 p-4 text-sm text-fg-muted">
          <p>Nhắc nhở hoá đơn định kỳ được gửi qua Brevo SMTP (gói miễn phí 300 email/ngày).</p>
          <ol className="ml-4 flex list-decimal flex-col gap-2">
            <li>Tạo tài khoản Brevo miễn phí.</li>
            <li>
              <strong>Xác minh một địa chỉ gửi</strong> (Senders → Add a sender → xác nhận qua email
              Brevo gửi tới). Có thể dùng chính Gmail của bạn — không cần tên miền/DNS. Đặt địa chỉ
              đã xác minh làm <code>ALERT_FROM_EMAIL</code>. Brevo từ chối gửi từ địa chỉ chưa xác
              minh.
            </li>
            <li>
              SMTP &amp; API → tạo SMTP key → đặt <code>BREVO_SMTP_USER</code> +{" "}
              <code>BREVO_SMTP_KEY</code>.
            </li>
            <li>
              Đặt <code>ALERT_TO_EMAIL</code> là hộp thư nhận của bạn.
            </li>
          </ol>
        </Card>
      </section>
    </div>
  );
}
