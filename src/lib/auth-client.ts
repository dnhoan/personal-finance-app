"use client";
import { createAuthClient } from "better-auth/react";

// Defaults to same-origin, which is what we want in every environment.
export const authClient = createAuthClient();

export const { useSession } = authClient;

// Only same-origin absolute paths are accepted as a post-login destination.
// Rejects protocol-relative ("//evil.com") and backslash ("/\\evil.com") forms
// that browsers resolve to external origins.
function safeReturnPath(from?: string): string {
  if (from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\")) {
    return from;
  }
  return "/dashboard";
}

/** Start Google OAuth. Success → /dashboard (or `from`); an OAuth error → /unauthorized. */
export async function signInWithGoogle(from?: string): Promise<void> {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: safeReturnPath(from),
    errorCallbackURL: "/unauthorized",
  });
}

// Best-effort Service Worker cache purge on sign-out. Scoped to the app's own
// `finance-*` caches so we never touch unrelated origins' caches, and also asks
// the active SW to purge its runtime caches (the SW owns caches the page may not
// see directly). Guarded so it never throws where there's no SW/Cache API.
async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "LOGOUT" });
  } catch {
    // ignore — best-effort
  }
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("finance-")).map((k) => caches.delete(k)));
  } catch {
    // ignore — cache clearing is best-effort
  }
}

/** Sign out, purge any cached app shell, then hard-redirect to sign-in. */
export async function signOutWithCacheClear(): Promise<void> {
  await authClient.signOut();
  await clearServiceWorkerCaches();
  if (typeof window !== "undefined") {
    window.location.href = "/sign-in";
  }
}
