import { describe, expect, it } from "vitest";
import { config } from "@/middleware";

// Regression guard: the cron endpoint receives no session cookie (cron-job.org
// sends none), so the cookie-presence middleware MUST NOT run on it — otherwise
// the POST is 302'd to /sign-in and the CRON_SECRET check never executes, making
// the daily alert silently unreachable in production.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("middleware matcher excludes the cron endpoint", () => {
  it("does NOT match /api/cron/renewal-check", () => {
    expect(matcher.test("/api/cron/renewal-check")).toBe(false);
  });

  it("does NOT match /api/auth/* (OAuth callback)", () => {
    expect(matcher.test("/api/auth/callback/google")).toBe(false);
  });

  // Same failure shape as cron: SePay authenticates with its own Apikey header
  // and sends no cookie, so a redirect here would swallow every delivery — and
  // its 7 retries — with nothing logged to diagnose from.
  it("does NOT match /api/webhooks/*", () => {
    expect(matcher.test("/api/webhooks/sepay")).toBe(false);
  });

  it("still matches protected app routes", () => {
    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/transactions")).toBe(true);
    expect(matcher.test("/settings/categories")).toBe(true);
  });
});
