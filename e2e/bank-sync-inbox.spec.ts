import { expect, test } from "@playwright/test";

// End-to-end coverage for the SePay bank-sync surface.
//
// SCOPE NOTE: the full happy path (deliver a webhook → see it in /inbox →
// categorise → see it in /transactions) needs BOTH an authenticated browser
// session and a seeded per-user token. Neither is reachable here: the allowlist
// Google OAuth flow cannot be driven by Playwright without a test-auth backdoor
// (the same constraint quick-add.spec.ts and help-and-welcome.spec.ts document),
// and the token only exists as a SHA-256 digest created through that same
// authenticated UI. That half of the flow is covered by the DB-backed
// integration suites — webhook-ingest and inbox-actions — which exercise the
// identical code path.
//
// What only an e2e run can prove is what this file asserts: how the deployed
// edge middleware treats the webhook route. A misconfigured matcher would 302
// every delivery to /sign-in, SePay would burn all 7 retries against a login
// page, and no unit test would notice, because the middleware never runs in one.

const WEBHOOK_PATH = "/api/webhooks/sepay";

const payload = {
  id: 99_000_001,
  gateway: "Vietcombank",
  transactionDate: "2026-08-15 10:30:00",
  accountNumber: "0123456789",
  transferType: "in",
  transferAmount: 500_000,
  content: "E2E probe",
};

test.describe("SePay webhook endpoint", () => {
  test("is reachable without a session instead of redirecting to sign-in", async ({ request }) => {
    // The regression this guards: /api/webhooks must sit OUTSIDE the middleware
    // matcher. A 3xx here means every real delivery is silently swallowed.
    const res = await request.post(WEBHOOK_PATH, {
      data: payload,
      headers: { authorization: "Apikey pfa_definitely-not-a-real-token" },
      maxRedirects: 0,
    });

    // Both halves matter: a 3xx would mean the matcher swallowed the delivery,
    // and only 401 proves the route's own auth ran.
    expect(res.status()).toBe(401);
    expect(res.status() >= 300 && res.status() < 400).toBe(false);
  });

  test("rejects a delivery with no Apikey header", async ({ request }) => {
    const res = await request.post(WEBHOOK_PATH, { data: payload, maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("rejects the wrong auth scheme", async ({ request }) => {
    // Bearer is the cron endpoint's scheme; this route must not accept it.
    const res = await request.post(WEBHOOK_PATH, {
      data: payload,
      headers: { authorization: "Bearer pfa_some-token" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("rejects an oversized token before doing any work", async ({ request }) => {
    const res = await request.post(WEBHOOK_PATH, {
      data: payload,
      headers: { authorization: `Apikey ${"x".repeat(10_000)}` },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("rejects a body over the size cap", async ({ request }) => {
    const res = await request.post(WEBHOOK_PATH, {
      data: { ...payload, content: "x".repeat(20_000) },
      headers: { authorization: "Apikey pfa_definitely-not-a-real-token" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(413);
  });
});

test.describe("bank-sync screens are behind the auth gate", () => {
  test("/inbox redirects an anonymous visitor to sign-in", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/sign-in\?from=%2Finbox/);
  });

  test("/settings/bank-sync redirects an anonymous visitor to sign-in", async ({ page }) => {
    // This screen renders the webhook URL and key controls, so it must never be
    // reachable without a session.
    await page.goto("/settings/bank-sync");
    await expect(page).toHaveURL(/\/sign-in\?from=%2Fsettings%2Fbank-sync/);
  });
});
