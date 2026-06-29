"use client";
import * as React from "react";

// Shared body for every (app)/<feature>/error.tsx boundary. Next requires each
// route's error file to be its own client component, so the per-route files are
// thin wrappers around this one. Logs once on mount (swap console for Sentry
// later) and offers a reset → retry of the failed segment render.
export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Đã có lỗi xảy ra
      </h1>
      <p className="max-w-xs text-sm text-fg-muted">Không tải được nội dung. Vui lòng thử lại.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Thử lại
      </button>
    </div>
  );
}
