"use client";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signOutWithCacheClear } from "@/lib/auth-client";

export default function UnauthorizedPage() {
  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-expense-soft">
          <ShieldX size={24} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
        </span>
        <h1
          className="pt-3 text-2xl font-semibold text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Không có quyền truy cập
        </h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-sm text-fg-muted">
          Tài khoản này không được phép sử dụng ứng dụng. Vui lòng liên hệ chủ sở hữu.
        </p>
        <Button type="button" variant="outline" onClick={() => void signOutWithCacheClear()}>
          Quay lại đăng nhập
        </Button>
      </CardContent>
    </Card>
  );
}
