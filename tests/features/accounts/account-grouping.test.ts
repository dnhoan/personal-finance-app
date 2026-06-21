import { describe, expect, it } from "vitest";
import { groupAccounts } from "@/features/accounts/account-grouping";
import type { AccountWithBalance } from "@/features/accounts/queries";

function account(over: Partial<AccountWithBalance>): AccountWithBalance {
  return {
    id: over.id ?? crypto.randomUUID(),
    name: over.name ?? "Acc",
    type: over.type ?? "cash",
    status: over.status ?? "open",
    currency: over.currency ?? "VND",
    balance: over.balance ?? 0,
  };
}

describe("groupAccounts", () => {
  it("splits assets vs liabilities by type === 'debt'", () => {
    const result = groupAccounts([
      account({ type: "bank", balance: 1000 }),
      account({ type: "debt", balance: 500 }),
      account({ type: "e_wallet", balance: 200 }),
    ]);
    expect(result.assets.rows).toHaveLength(2);
    expect(result.liabilities.rows).toHaveLength(1);
    expect(result.liabilities.rows[0]!.type).toBe("debt");
  });

  it("counts a receivable (owed to you) as an asset", () => {
    const result = groupAccounts([
      account({ type: "bank", balance: 1000 }),
      account({ type: "receivable", balance: 800 }),
    ]);
    expect(result.assets.rows).toHaveLength(2);
    expect(result.liabilities.rows).toHaveLength(0);
    expect(result.assets.subtotal).toBe(1800);
    expect(result.total).toBe(1800);
  });

  it("keeps a negative credit card under Assets (split by type, not sign)", () => {
    const result = groupAccounts([account({ type: "credit_card", balance: -1600 })]);
    expect(result.assets.rows).toHaveLength(1);
    expect(result.liabilities.rows).toHaveLength(0);
    expect(result.assets.subtotal).toBe(-1600);
  });

  it("computes total and per-group subtotals (debt owed reduces net worth)", () => {
    const result = groupAccounts([
      account({ type: "bank", balance: 1000 }),
      account({ type: "cash", balance: 500 }),
      // Debt balance is the positive amount still owed; it subtracts from total.
      account({ type: "debt", balance: 2000 }),
    ]);
    expect(result.assets.subtotal).toBe(1500);
    expect(result.liabilities.subtotal).toBe(-2000);
    expect(result.total).toBe(-500);
  });

  it("excludes archived accounts from total and subtotals", () => {
    const result = groupAccounts([
      account({ type: "bank", balance: 1000 }),
      account({ type: "cash", status: "archived", balance: 999 }),
    ]);
    expect(result.archived).toHaveLength(1);
    expect(result.assets.rows).toHaveLength(1);
    expect(result.total).toBe(1000);
  });

  it("handles an empty list", () => {
    const result = groupAccounts([]);
    expect(result.total).toBe(0);
    expect(result.assets.rows).toEqual([]);
    expect(result.liabilities.rows).toEqual([]);
    expect(result.archived).toEqual([]);
  });
});
