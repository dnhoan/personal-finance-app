"use client";
import * as React from "react";
import { KeyRound, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "./copy-button";
import { createWebhookToken, revokeWebhookToken } from "../actions";
import type { WebhookTokenMeta } from "../queries";

function formatDateTime(value: Date | null): string {
  if (!value) return "chưa dùng";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

/**
 * Issue / rotate / revoke the webhook API key.
 *
 * The raw key is held in component state for exactly as long as this screen
 * stays mounted — the server stores only its digest, so navigating away or
 * reloading destroys the only copy. Every affordance here is built around that
 * one fact: the value is shown immediately, copying is one tap, and the warning
 * sits next to the value rather than after it.
 */
export function WebhookTokenReveal({ token }: { token: WebhookTokenMeta | null }) {
  const [raw, setRaw] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirmRotate, setConfirmRotate] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);

  async function issue() {
    setBusy(true);
    try {
      const { token: fresh } = await createWebhookToken();
      setRaw(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được khoá");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      await revokeWebhookToken();
      setRaw(null);
      toast.success("Đã thu hồi khoá");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thu hồi được khoá");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {raw ? (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <TriangleAlert size={14} aria-hidden />
            Chỉ hiện một lần — copy ngay
          </p>
          <code className="block break-all rounded bg-surface px-2 py-1.5 font-mono text-xs text-fg">
            {raw}
          </code>
          <div className="flex justify-end">
            <CopyButton value={raw} label="khoá API" />
          </div>
          <p className="text-xs text-fg-muted">
            Rời khỏi trang này là không xem lại được. Mất khoá thì tạo khoá mới rồi cập nhật lại bên
            SePay.
          </p>
        </div>
      ) : null}

      {token ? (
        <p className="text-xs text-fg-muted">
          Đã tạo {formatDateTime(token.createdAt)} · Dùng lần cuối:{" "}
          {formatDateTime(token.lastUsedAt)}
        </p>
      ) : (
        <p className="text-xs text-fg-muted">
          Chưa có khoá nào. Tạo khoá để bắt đầu nhận giao dịch.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={token ? "outline" : "default"}
          size="sm"
          loading={busy}
          onClick={() => (token ? setConfirmRotate(true) : issue())}
        >
          <KeyRound size={15} aria-hidden />
          {token ? "Tạo khoá mới" : "Tạo khoá"}
        </Button>
        {token ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmRevoke(true)}
          >
            Thu hồi
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        title="Tạo khoá mới?"
        description="Khoá hiện tại ngừng hoạt động ngay. Giao dịch sẽ không về nữa cho tới khi bạn dán khoá mới vào SePay."
        confirmLabel="Tạo khoá mới"
        onConfirm={issue}
      />
      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Thu hồi khoá?"
        description="Giao dịch sẽ ngừng đồng bộ cho tới khi bạn tạo khoá mới."
        confirmLabel="Thu hồi"
        destructive
        onConfirm={revoke}
      />
    </div>
  );
}
