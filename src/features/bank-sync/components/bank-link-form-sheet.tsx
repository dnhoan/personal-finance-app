"use client";
import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { COMMON_GATEWAYS } from "../gateways";
import { upsertBankLink } from "../actions";
import type { LinkableAccount } from "../queries";

// Adds a (bank, account number) → internal account mapping. The account number
// is the join key against SePay's payload, so the copy here leans on getting it
// exactly right: one wrong digit routes every delivery to the unmatched pile.
export function BankLinkFormSheet({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: LinkableAccount[];
}) {
  const [gateway, setGateway] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const gatewayRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setGateway("");
      setAccountNumber("");
      setAccountId(accounts[0]?.id ?? "");
      setError(null);
    }
  }, [open, accounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gateway.trim()) {
      gatewayRef.current?.focus();
      return setError("Nhập tên ngân hàng");
    }
    if (!accountId) return setError("Chọn tài khoản trong ứng dụng");

    setSubmitting(true);
    try {
      await upsertBankLink({ accountId, gateway, accountNumber });
      toast.success("Đã liên kết tài khoản");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  const dirty = gateway.trim() !== "" || accountNumber.trim() !== "";

  function requestClose(next: boolean) {
    if (next) return onOpenChange(true);
    if (!dirty) return onOpenChange(false);
    toast("Bỏ thay đổi chưa lưu?", {
      action: { label: "Bỏ", onClick: () => onOpenChange(false) },
    });
  }

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent title="Thêm tài khoản ngân hàng">
        {accounts.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Chưa có tài khoản nào đủ điều kiện. Tạo một tài khoản loại “Ngân hàng” hoặc “Thẻ tín
            dụng” trước đã.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bl-gateway">Ngân hàng</Label>
              <Input
                ref={gatewayRef}
                id="bl-gateway"
                list="bank-gateways"
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                placeholder="VD: Vietcombank"
                autoComplete="off"
                spellCheck={false}
              />
              <datalist id="bank-gateways">
                {COMMON_GATEWAYS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <p className="text-xs text-fg-subtle">
                Nhập đúng tên ngân hàng như SePay hiển thị. Không có trong gợi ý thì gõ tay.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bl-number">Số tài khoản</Label>
              <Input
                id="bl-number"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="VD: 0123456789"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-fg-subtle">
                Phải khớp số tài khoản đã kết nối bên SePay — sai một chữ số là giao dịch không vào
                đúng ví.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bl-account">Ví trong ứng dụng</Label>
              <select
                id="bl-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-surface px-3 py-2 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-11"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => requestClose(false)}
              >
                Hủy
              </Button>
              <Button type="submit" className="flex-1" loading={submitting}>
                Liên kết
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
