import { describe, expect, it } from "vitest";
import { assertAllowlisted, isAllowlisted, AllowlistError } from "@/lib/auth-allowlist";

const ALLOWED = "owner@example.com";

describe("assertAllowlisted", () => {
  it("accepts the allowed, verified account", () => {
    expect(() => assertAllowlisted({ email: ALLOWED, emailVerified: true }, ALLOWED)).not.toThrow();
  });

  it("normalises case and whitespace on both sides", () => {
    expect(() =>
      assertAllowlisted({ email: "  Owner@Example.COM ", emailVerified: true }, ALLOWED),
    ).not.toThrow();
    expect(() =>
      assertAllowlisted({ email: ALLOWED, emailVerified: true }, "OWNER@EXAMPLE.COM"),
    ).not.toThrow();
  });

  it("rejects a different email even when verified", () => {
    try {
      assertAllowlisted({ email: "intruder@example.com", emailVerified: true }, ALLOWED);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AllowlistError);
      expect((e as AllowlistError).reason).toBe("email-mismatch");
    }
  });

  it("rejects the allowed email when it is not verified", () => {
    try {
      assertAllowlisted({ email: ALLOWED, emailVerified: false }, ALLOWED);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AllowlistError);
      expect((e as AllowlistError).reason).toBe("email-unverified");
    }
  });

  it("checks verification before email match", () => {
    // An unverified, non-matching account reports the verification failure first.
    try {
      assertAllowlisted({ email: "intruder@example.com", emailVerified: false }, ALLOWED);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as AllowlistError).reason).toBe("email-unverified");
    }
  });
});

describe("isAllowlisted", () => {
  it("returns true for the allowed verified account", () => {
    expect(isAllowlisted({ email: ALLOWED, emailVerified: true }, ALLOWED)).toBe(true);
  });

  it("returns false for mismatches and unverified accounts", () => {
    expect(isAllowlisted({ email: "x@y.com", emailVerified: true }, ALLOWED)).toBe(false);
    expect(isAllowlisted({ email: ALLOWED, emailVerified: false }, ALLOWED)).toBe(false);
  });
});
