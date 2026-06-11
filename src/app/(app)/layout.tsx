import { redirect } from "next/navigation";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { requireSession, UnauthorizedError } from "@/lib/auth-session";

// Server-side gate for the whole app shell. Middleware already blocked anonymous
// requests cheaply; here we do the authoritative validation + allowlist re-check.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let email: string;
  try {
    const { user } = await requireSession();
    email = user.email;
  } catch (e) {
    if (e instanceof UnauthorizedError && e.reason === "not-allowed") {
      redirect("/unauthorized");
    }
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <TopBar email={email} />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
