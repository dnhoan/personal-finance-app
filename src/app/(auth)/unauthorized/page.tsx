"use client";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signOutWithCacheClear } from "@/lib/auth-client";
import { ENTER } from "@/lib/enter-animation";

export default function UnauthorizedPage() {
  return (
    <Card className={`w-full ${ENTER}`}>
      <CardHeader className="items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-expense-soft">
          <ShieldX size={24} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
        </span>
        <h1
          className="pt-3 text-2xl font-semibold text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Đăng nhập không thành công
        </h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-sm text-fg-muted">
          Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại.
        </p>
        <Button type="button" variant="outline" onClick={() => void signOutWithCacheClear()}>
          Quay lại đăng nhập
        </Button>
      </CardContent>
    </Card>
  );
}
