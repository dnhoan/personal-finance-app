import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, _resetRateLimit } from "@/server/cron/rate-limit";

describe("cron rate-limit (10 req/min/IP)", () => {
  beforeEach(() => _resetRateLimit());

  it("allows 10 requests then rejects the 11th within the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(allowRequest("1.2.3.4", t0 + i)).toBe(true);
    }
    expect(allowRequest("1.2.3.4", t0 + 10)).toBe(false);
  });

  it("isolates buckets per IP", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 10; i++) allowRequest("1.1.1.1", t0);
    expect(allowRequest("1.1.1.1", t0)).toBe(false);
    expect(allowRequest("9.9.9.9", t0)).toBe(true);
  });

  it("resets after the window elapses", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 10; i++) allowRequest("5.5.5.5", t0);
    expect(allowRequest("5.5.5.5", t0)).toBe(false);
    expect(allowRequest("5.5.5.5", t0 + 60_000)).toBe(true);
  });
});
