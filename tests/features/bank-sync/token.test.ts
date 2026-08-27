import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateWebhookToken, hashToken, TOKEN_PREFIX } from "@/features/bank-sync/lib/token";

describe("webhook token", () => {
  it("hashes to plain SHA-256 hex", async () => {
    // Pinned against an independent digest: the webhook looks a token up by this
    // value, so a change to the algorithm silently invalidates every stored token.
    const raw = "pfa_example-token";
    expect(hashToken(raw)).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(hashToken(raw)).toHaveLength(64);
  });

  it("is stable across calls and sensitive to a single character", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("generates prefixed, unique tokens", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const token = generateWebhookToken();
      expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
      // 32 random bytes → 43 base64url chars, no padding.
      expect(token).toHaveLength(TOKEN_PREFIX.length + 43);
      seen.add(token);
    }
    expect(seen.size).toBe(1000);
  });

  it("never returns the raw token from its digest", () => {
    const raw = generateWebhookToken();
    expect(hashToken(raw)).not.toContain(raw.slice(TOKEN_PREFIX.length));
  });
});
