import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { DesktopAddFab } from "@/components/app-shell/desktop-add-fab";
import { Toaster } from "@/components/ui/toaster";
import { WelcomeDialog } from "@/features/help/components/welcome-dialog";
import { requireSession } from "@/lib/auth-session";
import { ensureUserProvisioned } from "@/lib/db/ensure-user-provisioned";

// Server-side gate for the whole app shell. Middleware already blocked anonymous
// requests cheaply; here we do the authoritative session validation. The global
// TopBar was removed — account identity + Sign Out live on Settings — so pages
// start at their own <h1>; the safe-area top inset keeps content clear of the
// status bar / notch.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let userId: string;
  try {
    const { user } = await requireSession();
    userId = user.id;
  } catch {
    redirect("/sign-in");
  }

  // Lazy first-sign-in provisioning: seeds categories + a default account for a
  // brand-new user. No-op (one indexed lookup) for already-provisioned users.
  await ensureUserProvisioned(userId);

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
      <WelcomeDialog />
    </div>
  );
}
