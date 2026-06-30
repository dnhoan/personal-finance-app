import { Download, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_TINTS, type SettingsTint } from "./settings-row";

// A download row for data export. Visually mirrors SettingsRow (tinted tile +
// label + description) but renders a plain <a download> so the browser fetches
// the attachment from the API route and the server-set filename wins. The
// trailing icon is a download glyph instead of a chevron to signal "saves a
// file" rather than "navigates".
export function SettingsDownloadRow({
  href,
  label,
  description,
  icon: Icon,
  tint = "navy",
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tint?: SettingsTint;
}) {
  return (
    <a
      href={href}
      download
      className="group flex min-h-[68px] items-center gap-3.5 border-b border-border p-3.5 text-fg transition-colors [-webkit-tap-highlight-color:transparent] last:border-b-0 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
          SETTINGS_TINTS[tint],
        )}
      >
        <Icon size={20} strokeWidth={1.85} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-fg">{label}</span>
        <span className="truncate text-[13px] text-fg-subtle">{description}</span>
      </span>
      <Download
        size={18}
        className="shrink-0 text-fg-subtle transition-transform group-hover:translate-y-0.5"
        aria-hidden="true"
      />
    </a>
  );
}
