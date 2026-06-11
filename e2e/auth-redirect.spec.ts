import { expect, test } from "@playwright/test";

test("unauthenticated request to /dashboard redirects to /sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in(\?|$)/);
});

test("sign-in carries the original path in ?from", async ({ page }) => {
  await page.goto("/budgets");
  await expect(page).toHaveURL(/\/sign-in\?from=%2Fbudgets/);
});

test("/sign-in is reachable without a session", async ({ page }) => {
  const res = await page.goto("/sign-in");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
});
