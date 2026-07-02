import { Card, CardContent } from "@/components/ui/card";
import { AppBrandBlock } from "@/components/brand/app-brand-mark";
import { SignInButton } from "@/components/auth/sign-in-button";
import { PwaInstallHint } from "@/components/pwa/pwa-install-hint";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Đăng nhập · Tài chính Cá nhân" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="flex w-full flex-col gap-8">
      <AppBrandBlock
        className={ENTER}
        style={enterDelay(60)}
        title="Tài chính Cá nhân"
        tagline="Quản lý từng đồng. Thật bình tâm."
      />

      <Card
        className={`w-full shadow-[0_4px_12px_rgba(27,29,35,0.06),0_1px_3px_rgba(27,29,35,0.04)] ${ENTER}`}
        style={enterDelay(120)}
      >
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <h2
              className="text-[22px] font-semibold leading-[28px] text-fg"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Chào mừng
            </h2>
            <p className="text-[13px] leading-[20px] text-fg-muted">
              Đăng nhập hoặc tạo tài khoản bằng Google. Mỗi tài khoản có không gian tài chính riêng
              tư, tách biệt hoàn toàn.
            </p>
          </div>

          <SignInButton from={from} />

          <p className="text-center text-[11px] leading-[16px] text-fg-subtle">
            Khi tiếp tục, bạn đồng ý với điều khoản sử dụng của ứng dụng.
          </p>
        </CardContent>
      </Card>

      <div className={ENTER} style={enterDelay(180)}>
        <PwaInstallHint />
      </div>
    </div>
  );
}
