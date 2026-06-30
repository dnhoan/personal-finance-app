import { describe, expect, it } from "vitest";
import { resolveDefaultAccountId } from "@/features/transactions/lib/resolve-default-account";

const a = (id: string) => ({ id });

describe("resolveDefaultAccountId", () => {
  it("returns the explicit default when one is set", () => {
    expect(resolveDefaultAccountId("acc-1", [a("acc-1"), a("acc-2")])).toBe("acc-1");
  });

  it("falls back to the only active account when no explicit default", () => {
    expect(resolveDefaultAccountId(null, [a("solo")])).toBe("solo");
  });

  it("returns null when no default and multiple active accounts (ambiguous)", () => {
    expect(resolveDefaultAccountId(null, [a("acc-1"), a("acc-2")])).toBeNull();
  });

  it("returns null when no default and no active accounts", () => {
    expect(resolveDefaultAccountId(null, [])).toBeNull();
  });

  it("prefers the explicit default even when it is the sole account", () => {
    expect(resolveDefaultAccountId("acc-1", [a("acc-1")])).toBe("acc-1");
  });
});
