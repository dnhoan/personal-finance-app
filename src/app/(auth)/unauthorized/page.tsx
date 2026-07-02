"use client";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOutWithCacheClear } from "@/lib/auth-client";
import { ENTER } from "@/lib/enter-animation";

export default function UnauthorizedPage() {
  return (
    <Card
      className={`w-full shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)] ${ENTER}`}
    >
      <CardContent className="flex flex-col items-center gap-5 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-expense-soft">
          <ShieldX size={26} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h1
            className="text-[22px] font-semibold leading-[28px] text-fg"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Đăng nhập chưa hoàn tất
          </h1>
          <p className="text-[13px] leading-[20px] text-fg-muted">
            Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại. Nếu việc đăng ký đang tạm
            dừng, bạn có thể quay lại sau.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void signOutWithCacheClear()}
        >
          Quay lại đăng nhập
        </Button>
      </CardContent>
    </Card>
  );
}
