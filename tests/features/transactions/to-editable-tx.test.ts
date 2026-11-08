import { describe, expect, it } from "vitest";
import type { TxLedgerItem, TxDetail } from "@/features/transactions/queries";
import { toEditableTx, type EditableTx } from "@/features/transactions/lib/to-editable-tx";
import {
  editAccountOptions,
  editCategoryOptions,
  initialEditState,
  naturalSingleAccount,
  openedRowSide,
} from "@/features/transactions/lib/transaction-edit-form-state";

const base: TxLedgerItem = {
  id: "r",
  kind: "transfer",
  amount: -50_000,
  occurredAt: new Date("2026-06-15T05:00:00Z"),
  note: null,
  merchant: null,
  accountId: "cash",
  accountName: "Tiền mặt",
  accountType: "cash",
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  categoryIcon: null,
  transferPairId: "m",
  recurringRuleId: null,
  reviewStatus: "confirmed",
  goalId: null,
  source: "manual",
  transferMateAccountId: "bank",
  transferMateAccountName: "Ngân hàng",
};

describe("toEditableTx", () => {
  it("prefills the out-leg as source and the mate as destination", () => {
    const tx = toEditableTx(base)!;
    expect(tx.isOutLeg).toBe(true);
    expect(tx.amount).toBe(50_000);
    const s = initialEditState(tx);
    expect([s.fromId, s.toId]).toEqual(["cash", "bank"]);
  });

  it("prefills the in-leg as destination", () => {
    const tx = toEditableTx({ ...base, amount: 50_000 })!;
    expect(openedRowSide(tx)).toBe("to");
    const s = initialEditState(tx);
    expect([s.fromId, s.toId]).toEqual(["bank", "cash"]);
  });

  it("returns null for a transfer with no resolvable mate", () => {
    expect(toEditableTx({ ...base, transferMateAccountId: null })).toBeNull();
  });

  it("reads the mate from a detail read", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transferMateAccountId, transferMateAccountName, ...shared } = base;
    const detail: TxDetail = {
      ...shared,
      goalName: null,
      transfer: {
        fromAccountName: "Tiền mặt",
        toAccountName: "Ngân hàng",
        mateAccountId: "bank",
        mateAccountName: "Ngân hàng",
      },
    };
    expect(toEditableTx(detail)?.mateAccountId).toBe("bank");
    expect(toEditableTx({ ...detail, transfer: null })).toBeNull();
  });

  it("puts an expense on the source side and an income on the destination side", () => {
    const exp = toEditableTx({ ...base, kind: "expense", amount: 1, transferMateAccountId: null })!;
    expect(initialEditState(exp).fromId).toBe("cash");
    const inc = toEditableTx({ ...base, kind: "income", amount: 1, transferMateAccountId: null })!;
    expect(initialEditState(inc).toId).toBe("cash");
  });
});

describe("edit form helpers", () => {
  const tx = toEditableTx(base)!;

  it("picks the natural account when a transfer becomes Chi/Thu", () => {
    const s = { fromId: "cash", toId: "bank" };
    expect(naturalSingleAccount(tx, "expense", s)).toBe("cash");
    expect(naturalSingleAccount(tx, "income", s)).toBe("bank");
    const synced: EditableTx = { ...tx, source: "bank_sync", accountId: "bank" };
    expect(naturalSingleAccount(synced, "expense", s)).toBe("bank");
  });

  it("drops debt accounts when a transfer is involved and keeps archived own accounts", () => {
    const accounts = [
      { id: "cash", name: "Tiền mặt", type: "cash" as const },
      { id: "debt", name: "Nợ", type: "debt" as const },
    ];
    const ids = editAccountOptions(tx, accounts, true).map((o) => o.id);
    expect(ids).toEqual(["cash", "bank"]); // bank not active → appended as archived
    expect(editAccountOptions(tx, accounts, false).map((o) => o.id)).toContain("debt");
  });

  it("appends the row's archived category", () => {
    const exp: EditableTx = { ...tx, kind: "expense", categoryId: "old", categoryName: "Cũ" };
    const opts = editCategoryOptions(exp, []);
    expect(opts).toHaveLength(1);
    expect(opts[0]!.name).toContain("đã lưu trữ");
  });
});
