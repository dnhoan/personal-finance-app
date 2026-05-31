import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const preferredRegion = ["sin1"];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 py-12">
      <h1
        className="text-center text-4xl font-semibold leading-tight md:text-5xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Personal Finance
      </h1>
      <p className="text-center text-base text-[color:var(--color-fg-muted)]">
        Ứng dụng quản lý tài chính cá nhân.
      </p>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Phase 1 scaffold</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Next.js 15 + Tailwind v4 + Drizzle + shadcn/ui đã sẵn sàng.
          </p>
          <Button>Bắt đầu</Button>
          <Button variant="outline">Tìm hiểu</Button>
        </CardContent>
      </Card>
    </main>
  );
}
