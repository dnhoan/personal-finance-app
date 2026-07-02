import { expect, test } from "@playwright/test";

// The full authenticated quick-add flow (sign in → tap FAB → enter 50k →
// submit → row appears) requires a real Google session, which the allowlist
// OAuth flow can't drive in Playwright without a test-auth backdoor (same
// constraint as Phase 2). That happy-path is covered by the server-action
// integration tests (transfer-atomic / idempotency) + the vnd unit suite;
// here we assert the new feature routes are gated by the auth middleware.

test("unauthenticated request to /transactions redirects to /sign-in", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("unauthenticated request to /accounts redirects to /sign-in", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("unauthenticated request to /add redirects to /sign-in", async ({ page }) => {
  await page.goto("/add");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("transactions route carries its path in ?from for post-login return", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/sign-in\?from=%2Ftransactions/);
});

// The detail route (tap a row → /transactions/<id>) is a per-user resource; the
// authed happy path (list → tap → detail fields → back) can't be driven here for
// the reason above and is covered by the getTransactionDetail integration test.
// This asserts the new dynamic route is behind the same auth gate as the list.
test("unauthenticated request to a transaction detail redirects to /sign-in", async ({ page }) => {
  await page.goto("/transactions/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});
