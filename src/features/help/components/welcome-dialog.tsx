"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HELP_SECTIONS, WELCOME_TIP_IDS } from "@/features/help/help-content";
import { useWelcomeSeen } from "@/features/help/use-welcome-seen";

// The starter tips the welcome highlights, resolved from the shared content
// module so the teaser can never name a section that doesn't exist. A unit test
// guards that every WELCOME_TIP_IDS entry maps to a real section.
const WELCOME_SECTIONS = WELCOME_TIP_IDS.map((id) =>
  HELP_SECTIONS.find((section) => section.id === id),
).filter((section): section is (typeof HELP_SECTIONS)[number] => Boolean(section));

// Presentational sheet body shared by the first-run dialog and the /help re-open
// button. The parent owns open state and decides what closing means (the auto
// dialog marks the flag; the re-open button just hides it).
function WelcomeSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Chào mừng!" data-testid="welcome-dialog">
        <p className="px-2 text-sm text-fg-muted">
          Ứng dụng giúp bạn ghi chép thu chi, theo dõi tài khoản và nắm rõ dòng tiền — tất cả bằng
          tiếng Việt.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {WELCOME_SECTIONS.map(({ id, icon: Icon, title, summary }) => (
            <li key={id} className="flex items-start gap-3 px-2">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{title}</span>
                <span className="block text-[13px] text-fg-subtle">{summary}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2.5 px-2">
          <Button asChild>
            <Link href={"/help" as Route} onClick={() => onOpenChange(false)}>
              Xem hướng dẫn
            </Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bắt đầu
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// First-run entry: mounted once in the app shell. Opens only when the device has
// not seen it; any dismissal (button, guide link, backdrop, Esc) marks it seen.
export function WelcomeDialog() {
  const { seen, markSeen } = useWelcomeSeen();
  const pathname = usePathname();
  // Don't stack the auto welcome on top of the guide it points to: a first-run
  // user who lands on /help directly (e.g. post-login ?from=%2Fhelp) already sees
  // the full reference, and /help carries its own "Xem lại giới thiệu" re-open
  // button. The flag stays unset here, so the welcome still shows once on the
  // next non-/help route.
  return (
    <WelcomeSheet
      open={seen === false && pathname !== "/help"}
      onOpenChange={(next) => {
        if (!next) markSeen();
      }}
    />
  );
}

// Re-open entry for the /help page: shows the intro on demand, independent of the
// seen flag, so the guide is never a dead end. Does not touch persistence.
export function WelcomeReopenButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto block w-fit rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Xem lại giới thiệu
      </button>
      <WelcomeSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
