import { MoreVertical, Share } from "lucide-react";

// Static, informational "install as an app" hint shown below the sign-in card.
// No `beforeinstallprompt` wiring and no standalone detection (iOS has no
// install prompt; the sign-in page is rarely viewed in standalone) — YAGNI.
// Icons are decorative; the text carries the meaning.
export function PwaInstallHint() {
  return (
    <div className="text-center">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        Cài đặt như ứng dụng
      </p>
      <p className="text-[12px] leading-[18px] text-fg-muted">
        <Share size={12} strokeWidth={2} className="mr-1 inline align-[-1px]" aria-hidden="true" />
        Chia sẻ → Thêm vào Màn hình chính (iOS) ·{" "}
        <MoreVertical
          size={12}
          strokeWidth={2}
          className="mr-1 inline align-[-1px]"
          aria-hidden="true"
        />
        Menu → Cài đặt (Android)
      </p>
    </div>
  );
}
