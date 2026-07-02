import type { CSSProperties } from "react";
import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

// Shared brand primitive for auth / empty-state screens. The tile is purely
// decorative (`aria-hidden`) — the accessible name always comes from the
// heading text in `AppBrandBlock`, never from the icon. Styling is token-only
// (`--color-primary*`) so light and dark parity comes for free.

const TILE_SIZE = {
  md: { tile: "h-12 w-12", icon: 22 },
  lg: { tile: "h-16 w-16", icon: 28 },
} as const;

export function AppBrandMark({
  size = "lg",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const { tile, icon } = TILE_SIZE[size];
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
        tile,
        className,
      )}
    >
      <Wallet size={icon} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

export function AppBrandBlock({
  title,
  tagline,
  titleAs: TitleTag = "h1",
  className,
  style,
}: {
  title: string;
  tagline?: string;
  titleAs?: "h1" | "h2";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)} style={style}>
      <AppBrandMark />
      <div className="flex flex-col gap-1.5">
        <TitleTag
          className="text-[28px] font-semibold leading-[34px] text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </TitleTag>
        {tagline ? <p className="text-[15px] leading-[22px] text-fg-muted">{tagline}</p> : null}
      </div>
    </div>
  );
}
