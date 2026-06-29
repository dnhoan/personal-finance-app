import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Automated accessibility sweep. The authenticated app routes (/dashboard, etc.)
// redirect anonymous Playwright sessions to /sign-in — the same allowlist-OAuth
// constraint that blocks the authed quick-add e2e — so the bot-reachable surfaces
// are the public pages. We assert zero serious/critical violations on each.
// Manual keyboard-only smoke covers the authed views (see phase-10 README notes).
const PUBLIC_ROUTES = ["/sign-in", "/offline", "/unauthorized"];

for (const route of PUBLIC_ROUTES) {
  test(`axe: ${route} has no serious/critical violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
