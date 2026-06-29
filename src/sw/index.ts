/// <reference lib="webworker" />
import { Serwist, NetworkFirst, NetworkOnly, CacheFirst } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

// Serwist injects the build manifest here at compile time.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Cache name is versioned with the build id (git short SHA, injected at build).
// A new deploy => new cache name => old caches evicted on activate, so a stale SW
// can never serve a prior bundle silently. The shared `finance-` prefix is what
// the logout flow targets for deletion.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const CACHE_PREFIX = "finance-v" + BUILD_ID;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Activate the new worker immediately (paired with the update-available toast
  // so the user gets a deterministic reload prompt rather than a silent swap).
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Authenticated app views must never be cached — they hold user data.
      matcher: ({ url }) =>
        /^\/(dashboard|accounts|transactions|budgets|goals|debts|reports|settings)/.test(
          url.pathname,
        ),
      handler: new NetworkOnly(),
    },
    {
      // API + exports are always live; NetworkOnly also keeps the SW from caching
      // the CSV/JSON export responses.
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // Immutable build output + icons + manifest: serve from cache first.
      matcher: ({ url }) =>
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/icons/") ||
        url.pathname === "/manifest.json",
      handler: new CacheFirst({ cacheName: CACHE_PREFIX + "-static" }),
    },
    {
      // HTML navigations: try network (3s), fall back to cache, then /offline.
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: CACHE_PREFIX + "-pages",
        networkTimeoutSeconds: 3,
      }),
    },
  ],
  // Serve the precached /offline shell when a navigation has no network + no cache.
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.mode === "navigate" }],
  },
});

// On logout the client posts {type:'LOGOUT'}; purge every finance-* runtime cache
// so the next user (or next session) can't read the prior session's cached shell.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "LOGOUT") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k.startsWith("finance-")).map((k) => caches.delete(k))),
        ),
    );
  }
});

serwist.addEventListeners();
