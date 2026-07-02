import { Card } from "@/components/ui/card";
import { SETTINGS_TINTS, type SettingsTint } from "@/features/settings/components/settings-row";
import type { HelpSection } from "@/features/help/help-content";
import { cn } from "@/lib/utils";

// One feature section of the guide: a tinted icon tile (reusing the Settings
// tint tokens so light/dark resolve automatically), title, summary, then the
// tip list. No interactivity — renders inside a Server Component page.
export function HelpSectionCard({
  section,
  tint = "navy",
}: {
  section: HelpSection;
  tint?: SettingsTint;
}) {
  const { icon: Icon, title, summary, tips } = section;
  return (
    <Card id={section.id} className="p-4">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            SETTINGS_TINTS[tint],
          )}
        >
          <Icon size={20} strokeWidth={1.85} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg">{title}</h2>
          <p className="mt-0.5 text-[13px] text-fg-subtle">{summary}</p>
        </div>
      </div>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2 text-sm text-fg-muted">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-subtle" />
            <span className="min-w-0">
              {tip.term ? <span className="font-semibold text-fg">{tip.term}: </span> : null}
              {tip.text}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
