import { describe, expect, it } from "vitest";
import { verifyCronSecret } from "@/server/auth/verify-cron-secret";
import { env } from "@/lib/env";

// The verifier reads env.CRON_SECRET (loaded from .env.local in tests/setup.ts).
describe("verifyCronSecret", () => {
  it("rejects a missing Authorization header (pre-crypto)", () => {
    expect(verifyCronSecret(null)).toBe(false);
  });

  it("rejects a non-Bearer header (pre-crypto)", () => {
    expect(verifyCronSecret(env.CRON_SECRET)).toBe(false);
    expect(verifyCronSecret(`Basic ${env.CRON_SECRET}`)).toBe(false);
  });

  it("rejects a wrong secret (post-timingSafeEqual)", () => {
    expect(verifyCronSecret("Bearer not-the-real-secret")).toBe(false);
  });

  it("accepts the correct Bearer secret", () => {
    expect(verifyCronSecret(`Bearer ${env.CRON_SECRET}`)).toBe(true);
  });
});
