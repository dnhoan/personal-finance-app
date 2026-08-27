"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { WebhookTokenReveal } from "./webhook-token-reveal";
import { BankLinkFormSheet } from "./bank-link-form-sheet";
import { BankLinkRow } from "./bank-link-row";
import type { BankLinkRow as BankLinkRowData, LinkableAccount, WebhookTokenMeta } from "../queries";
import type { BalanceDrift } from "../balance-drift-types";

// Setup screen for bank sync: the two values the user pastes into SePay, then
// the account mapping. Ordered the way the task is actually performed —
// URL, key, then "which bank account is which wallet" — because the SePay side
// has to be configured before a mapping is worth creating.
export function BankSyncSetupCard({
  webhookUrl,
  token,
  links,
  drifts,
  linkableAccounts,
}: {
  webhookUrl: string;
  token: WebhookTokenMeta | null;
  links: BankLinkRowData[];
  drifts: BalanceDrift[];
  linkableAccounts: LinkableAccount[];
}) {
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-2.5">
        <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
          Kết nối SePay
        </h2>
        <Card className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-fg">1. URL webhook</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-surface-muted px-2 py-1.5 font-mono text-xs text-fg-muted">
                {webhookUrl}
              </code>
              <CopyButton value={webhookUrl} label="URL webhook" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-fg">2. Khoá API</p>
            <WebhookTokenReveal token={token} />
          </div>

          <div className="rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-fg-muted">
            <p className="mb-1.5 font-semibold text-fg">Cấu hình bên SePay</p>
            <ol className="flex list-inside list-decimal flex-col gap-1">
              <li>Vào phần quản lý webhook, thêm một webhook mới.</li>
              <li>Dán URL ở trên vào ô địa chỉ nhận dữ liệu.</li>
              <li>Chọn kiểu xác thực bằng API key, rồi dán khoá ở trên vào.</li>
              <li>Bật nhận cả giao dịch tiền vào lẫn tiền ra.</li>
            </ol>
            <p className="mt-2">
              Mỗi tài khoản ngân hàng cần một webhook riêng bên SePay, nhưng tất cả dùng chung URL
              và khoá này — ứng dụng tự phân về đúng ví dựa trên ngân hàng và số tài khoản.
            </p>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
          Tài khoản đã liên kết
        </h2>
        <Card className="overflow-hidden p-0">
          {links.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">
              Chưa liên kết tài khoản nào. Giao dịch về từ ngân hàng chưa khai báo sẽ chờ ở đây cho
              tới khi bạn thêm liên kết.
            </p>
          ) : (
            links.map((link) => (
              <BankLinkRow
                key={link.id}
                link={link}
                drift={drifts.find((d) => d.bankLinkId === link.id) ?? null}
              />
            ))
          )}
        </Card>
        <Button type="button" variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus size={16} aria-hidden />
          Thêm tài khoản ngân hàng
        </Button>
      </section>

      <BankLinkFormSheet open={addOpen} onOpenChange={setAddOpen} accounts={linkableAccounts} />
    </div>
  );
}
