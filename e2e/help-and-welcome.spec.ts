import { expect, test } from "@playwright/test";

// The authenticated help/welcome happy path (first-run welcome shows once →
// "Xem hướng dẫn" → /help guide → Settings "Trợ giúp" → /help) needs a real
// Google session, which the allowlist OAuth flow can't drive in Playwright
// without a test-auth backdoor (same constraint as quick-add.spec.ts). That flow
// is covered by the help-content invariants + use-welcome-seen unit suites; here
// we assert the new /help route sits behind the same auth gate as the rest of
// the app shell, so the guide is never reachable anonymously.

test("unauthenticated request to /help redirects to /sign-in", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("help route carries its path in ?from for post-login return", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveURL(/\/sign-in\?from=%2Fhelp/);
});
