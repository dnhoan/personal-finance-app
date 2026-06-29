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

  it("still matches protected app routes", () => {
    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/transactions")).toBe(true);
    expect(matcher.test("/settings/email-alerts")).toBe(true);
  });
});
