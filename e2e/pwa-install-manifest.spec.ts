import { expect, test } from "@playwright/test";

// The manifest is static and public, so it's assertable in any environment.
test("GET /manifest.json returns a valid, installable manifest", async ({ request }) => {
  const res = await request.get("/manifest.json");
  expect(res.status()).toBe(200);

  const manifest = await res.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.start_url).toBe("/dashboard");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#FAF8F5");
  expect(manifest.background_color).toBe("#FAF8F5");

  // Android needs a 192 + 512; the install/splash needs a maskable variant.
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
  expect(purposes).toContain("maskable");
});

// The service worker is only emitted by the production build (Serwist is disabled
// in dev to avoid the Turbopack HMR collision), so this only runs in CI where the
// suite tests `next start`. It asserts the worker is reachable and its versioned
// cache prefix is present in the generated bundle.
test("GET /sw.js is reachable and uses a versioned finance cache", async ({ request }) => {
  test.skip(!process.env.CI, "service worker only built in production (CI)");

  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("finance-v");
});
