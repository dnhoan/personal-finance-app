import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton } from "@/components/auth/sign-in-button";
import { ENTER } from "@/lib/enter-animation";

export const metadata = { title: "Đăng nhập · Personal Finance" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <Card className={`w-full ${ENTER}`}>
      <CardHeader className="text-center">
        <h1
          className="text-3xl font-semibold leading-tight text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Personal Finance
        </h1>
        <CardTitle className="pt-2 text-base font-normal text-fg-muted">
          Quản lý tài chính cá nhân
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SignInButton from={from} />
        <p className="text-center text-xs text-fg-subtle">
          Chỉ tài khoản được cấp quyền mới có thể truy cập.
        </p>
      </CardContent>
    </Card>
  );
}
