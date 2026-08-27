import { describe, expect, it } from "vitest";
import { sepayWebhookSchema } from "@/server/webhooks/sepay/payload-schema";
import { parseIctDateTime } from "@/lib/month";

function base(over: Record<string, unknown> = {}) {
  return {
    id: 92704,
    gateway: "Vietcombank",
    transactionDate: "2026-08-15 10:30:00",
    accountNumber: "0123456789",
    transferType: "in",
    transferAmount: 500_000,
    ...over,
  };
}

describe("parseIctDateTime", () => {
  it("reads the timestamp as Vietnam wall clock, not UTC", () => {
    // 10:30 ICT is 03:30 UTC. Parsing the bare string on a UTC server would be
    // 7 hours off and would bucket late-night rows into the wrong month.
    expect(parseIctDateTime("2026-08-15 10:30:00").toISOString()).toBe("2026-08-15T03:30:00.000Z");
  });

  it("keeps a late-night transaction in its ICT month", () => {
    expect(parseIctDateTime("2026-08-31 23:30:00").toISOString()).toBe("2026-08-31T16:30:00.000Z");
    expect(parseIctDateTime("2026-09-01 00:30:00").toISOString()).toBe("2026-08-31T17:30:00.000Z");
  });

  it("returns an Invalid Date rather than throwing", () => {
    expect(Number.isNaN(parseIctDateTime("25/03/2023 14:02").getTime())).toBe(true);
  });
});

describe("sepayWebhookSchema", () => {
  it("accepts a minimal valid payload and stringifies the numeric id", () => {
    const parsed = sepayWebhookSchema.parse(base());
    expect(parsed.id).toBe("92704");
    expect(parsed.transferAmount).toBe(500_000);
  });

  it("rejects a date that is well-formed but not a real calendar date", () => {
    expect(
      sepayWebhookSchema.safeParse(base({ transactionDate: "2026-02-30 10:00:00" })).success,
    ).toBe(false);
    expect(
      sepayWebhookSchema.safeParse(base({ transactionDate: "25/03/2023 14:02" })).success,
    ).toBe(false);
  });

  it("bounds every free-text field", () => {
    // Signup is open, so a token is minutes away for anyone; without caps it is
    // an unbounded JSON-write primitive into a shared database.
    expect(sepayWebhookSchema.safeParse(base({ content: "x".repeat(2001) })).success).toBe(false);
    expect(sepayWebhookSchema.safeParse(base({ gateway: "x".repeat(65) })).success).toBe(false);
    expect(sepayWebhookSchema.safeParse(base({ accountNumber: "1".repeat(33) })).success).toBe(
      false,
    );
    expect(sepayWebhookSchema.safeParse(base({ id: "x".repeat(65) })).success).toBe(false);
  });

  it("rejects impossible amounts and unknown transfer types", () => {
    expect(sepayWebhookSchema.safeParse(base({ transferAmount: -1 })).success).toBe(false);
    expect(sepayWebhookSchema.safeParse(base({ transferAmount: 1e15 })).success).toBe(false);
    expect(sepayWebhookSchema.safeParse(base({ transferAmount: Infinity })).success).toBe(false);
    expect(sepayWebhookSchema.safeParse(base({ transferType: "internal" })).success).toBe(false);
  });

  it("accepts zero, which is recorded but creates no transaction", () => {
    expect(sepayWebhookSchema.safeParse(base({ transferAmount: 0 })).success).toBe(true);
  });
});
