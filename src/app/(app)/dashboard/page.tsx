import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-session";

export const metadata = { title: "Trang chủ · Personal Finance" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Chào mừng trở lại
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{user.name || user.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            Bảng điều khiển sẽ hiển thị dòng tiền và ngân sách trong các giai đoạn tiếp theo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
