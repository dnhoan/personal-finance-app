import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetWebhookRateLimit,
  allowWebhookIp,
  allowWebhookToken,
} from "@/server/webhooks/rate-limit";

// The webhook limiter must NOT behave like the cron one (10/60s per IP): every
// user's SePay traffic shares an egress IP, and a rejected delivery is lost
// permanently because v1 has no backfill.
describe("webhook rate limit", () => {
  beforeEach(() => _resetWebhookRateLimit());

  it("allows a burst far beyond the cron limiter's ceiling", () => {
    for (let i = 0; i < 120; i++) {
      expect(allowWebhookIp("1.2.3.4")).toBe(true);
    }
    expect(allowWebhookIp("1.2.3.4")).toBe(false);
  });

  it("keeps IP and token buckets independent", () => {
    for (let i = 0; i < 120; i++) allowWebhookIp("1.2.3.4");
    expect(allowWebhookIp("1.2.3.4")).toBe(false);
    // Exhausting an IP must not throttle a token that has sent nothing.
    expect(allowWebhookToken("token-a")).toBe(true);
  });

  it("counts each key separately", () => {
    for (let i = 0; i < 120; i++) allowWebhookIp("1.1.1.1");
    expect(allowWebhookIp("1.1.1.1")).toBe(false);
    expect(allowWebhookIp("2.2.2.2")).toBe(true);
  });

  it("rolls over into a fresh window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 120; i++) allowWebhookIp("9.9.9.9", t0);
    expect(allowWebhookIp("9.9.9.9", t0)).toBe(false);
    expect(allowWebhookIp("9.9.9.9", t0 + 60_000)).toBe(true);
  });

  it("gives tokens a higher ceiling than IPs", () => {
    for (let i = 0; i < 300; i++) {
      expect(allowWebhookToken("token-b")).toBe(true);
    }
    expect(allowWebhookToken("token-b")).toBe(false);
  });
});
