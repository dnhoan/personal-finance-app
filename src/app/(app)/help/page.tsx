import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { HelpSectionCard } from "@/features/help/components/help-section-card";
import { WelcomeReopenButton } from "@/features/help/components/welcome-dialog";
import { HELP_SECTIONS } from "@/features/help/help-content";
import type { SettingsTint } from "@/features/settings/components/settings-row";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Hướng dẫn · Personal Finance" };

// Cycle the section tints for visual rhythm without hardcoding a color per card.
const TINTS: SettingsTint[] = ["navy", "sage", "amber", "green"];

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className={ENTER}>
        <Link
          href={"/settings" as Route}
          className="-ml-1 flex w-fit items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> Cài đặt
        </Link>
        <h1
          className="mt-2 text-[28px] font-semibold leading-tight text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Hướng dẫn sử dụng
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Tất cả tính năng của ứng dụng, giải thích ngắn gọn.
        </p>
      </header>

      {HELP_SECTIONS.map((section, i) => (
        <div key={section.id} className={ENTER} style={enterDelay(60 + i * 40)}>
          <HelpSectionCard section={section} tint={TINTS[i % TINTS.length]} />
        </div>
      ))}

      <div className={ENTER} style={enterDelay(60 + HELP_SECTIONS.length * 40)}>
        <WelcomeReopenButton />
      </div>
    </div>
  );
}
