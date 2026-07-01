import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { DesktopAddFab } from "@/components/app-shell/desktop-add-fab";
import { Toaster } from "@/components/ui/toaster";
import { requireSession, UnauthorizedError } from "@/lib/auth-session";

// Server-side gate for the whole app shell. Middleware already blocked anonymous
// requests cheaply; here we do the authoritative validation + allowlist re-check.
// The global TopBar was removed — account identity + Sign Out live on Settings —
// so pages start at their own <h1>; the safe-area top inset keeps content clear
// of the status bar / notch.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSession();
  } catch (e) {
    if (e instanceof UnauthorizedError && e.reason === "not-allowed") {
      redirect("/unauthorized");
    }
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-ring"
      >
        Bỏ qua tới nội dung
      </a>
      <main
        id="main-content"
        className="mx-auto max-w-3xl overflow-x-hidden px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] md:pb-8"
      >
        {children}
      </main>
      <BottomNav />
      <DesktopAddFab />
      <Toaster />
    </div>
  );
}
