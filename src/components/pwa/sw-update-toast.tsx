"use client";
import * as React from "react";
import { toast } from "sonner";

// Registers the service worker and surfaces an "update available" toast.
//
// Serwist ships with skipWaiting+clientsClaim, so a freshly installed worker takes
// control without a manual prompt — `controllerchange` then fires. We only toast
// when an existing controller is being *replaced* (not the first install), and
// guard with a one-shot flag so the post-reload swap doesn't loop. Disabled in
// dev (the SW isn't built there) — registration just no-ops on a missing /sw.js.
export function SwUpdateToast() {
  React.useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    function onControllerChange() {
      // First-ever install (no prior controller) is silent; only an in-place
      // bundle swap warrants a reload prompt.
      if (!hadController || reloading) return;
      toast("Đã có bản cập nhật", {
        description: "Tải lại để dùng phiên bản mới nhất.",
        action: {
          label: "Tải lại",
          onClick: () => {
            reloading = true;
            window.location.reload();
          },
        },
        duration: Infinity,
      });
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No SW in this environment (e.g. dev) — nothing to update.
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
