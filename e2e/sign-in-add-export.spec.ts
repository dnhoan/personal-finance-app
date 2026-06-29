import { expect, test } from "@playwright/test";

// Keystone flow: sign-in → add tx → view dashboard → export CSV.
//
// The full authenticated happy path needs a real Google session, which the
// allowlist-OAuth flow can't drive in Playwright without a test-auth backdoor
// (same constraint documented in quick-add.spec.ts / Phase 2). The authed steps
// (add tx, dashboard render) are covered by the server-action integration tests;
// the CSV correctness + formula-injection neutralisation is covered by the
// csv-injection unit suite. Here we assert the export endpoints are gated so the
// keystone's data-egress surface can never be hit anonymously.

test("export CSV endpoint is not reachable without a session", async ({ page }) => {
  await page.goto("/api/export/csv?entity=transactions");
  // Cookie middleware redirects anonymous requests to sign-in before the handler.
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("export JSON endpoint is not reachable without a session", async ({ page }) => {
  await page.goto("/api/export/json");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("settings (export entry point) redirects anonymous users to sign-in", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?from=%2Fsettings/);
});
