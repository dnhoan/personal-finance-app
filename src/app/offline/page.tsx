"use client";

// Service-worker navigation fallback: shown when a page request has no network
// and no cached copy. Lives outside the (app) auth group so it renders without a
// session or DB round-trip — the whole point is that it works offline.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Không có kết nối
      </h1>
      <p className="max-w-xs text-sm text-fg-muted">
        Bạn đang ngoại tuyến. Kiểm tra kết nối mạng rồi thử lại.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Thử lại
      </button>
    </main>
  );
}
