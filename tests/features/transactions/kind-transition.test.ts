import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import {
  accounts,
  bankLinks,
  bankSyncEvents,
  categories,
  goals,
  transactions,
} from "@/lib/db/schema";
import { insertTransferAtomic } from "@/features/transactions/repository";
import { updateTransactionInDb } from "@/features/transactions/repository-update-transaction";
import { updateTxSchema, type UpdateTxInput } from "@/features/transactions/schemas";
import { TxEditRejection } from "@/features/transactions/lib/tx-edit-rejection";
import { getAccountWithBalance } from "@/features/accounts/queries";
import { listPendingTransactions } from "@/features/bank-sync/inbox-queries";

// Editing a transaction across kinds, against a live Neon branch. Every branch
// must keep the opened row's id, sign amounts per the transfer invariant, keep
// transfer_pair_id mutual, move account balances by the right delta, and never
// leave an orphan leg — including under concurrent double-submits.
const stamp = Date.now();
const OWNER = `test-kind-${stamp}`;
const OTHER = `test-kind-other-${stamp}`;
const AT = new Date("2026-06-15T05:00:00Z");

let cash: string;
let bank: string;
let wallet: string;
let debt: string;
let linkedBank: string;
let linkedBank2: string;
let archivedAcc: string;
let foodCat: string;
let salaryCat: string;
let archivedCat: string;
let goalId: string;
let otherAccount: string;
let otherCategory: string;

const update = (input: UpdateTxInput) => updateTransactionInDb(OWNER, updateTxSchema.parse(input));

async function makeAccount(
  userId: string,
  name: string,
  type: "cash" | "bank" | "debt" = "cash",
  status: "open" | "archived" = "open",
) {
  const [a] = await db
    .insert(accounts)
    .values({ userId, name, type, status })
    .returning({ id: accounts.id });
  return a!.id;
}

async function makeCategory(
  userId: string,
  name: string,
  kind: "income" | "expense",
  archived = false,
) {
  const [c] = await db
    .insert(categories)
    .values({
      userId,
      name,
      slug: `${name}-${stamp}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      archivedAt: archived ? new Date() : null,
    })
    .returning({ id: categories.id });
  return c!.id;
}

async function makeTx(values: Partial<typeof transactions.$inferInsert> & { accountId: string }) {
  const [row] = await db
    .insert(transactions)
    .values({ userId: OWNER, kind: "expense", amount: "100000", occurredAt: AT, ...values })
    .returning({ id: transactions.id });
  return row!.id;
}

async function row(id: string) {
  const [r] = await db.select().from(transactions).where(eq(transactions.id, id));
  return r;
}

async function balance(accountId: string) {
  return (await getAccountWithBalance(OWNER, accountId))!.balance;
}

// No transfer leg may exist without a mutually-linked, same-user counterpart.
async function expectNoOrphanLegs() {
  const legs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, OWNER), eq(transactions.kind, "transfer")));
  const byId = new Map(legs.map((l) => [l.id, l]));
  for (const leg of legs) {
    expect(leg.transferPairId).not.toBeNull();
    expect(byId.get(leg.transferPairId!)?.transferPairId).toBe(leg.id);
  }
}

describe("updateTransactionInDb — kind transitions", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: OWNER, name: "Kind", email: `kind-${stamp}@example.test`, emailVerified: true },
      { id: OTHER, name: "Other", email: `kind-o-${stamp}@example.test`, emailVerified: true },
    ]);
    cash = await makeAccount(OWNER, "Tiền mặt");
    bank = await makeAccount(OWNER, "Ngân hàng", "bank");
    wallet = await makeAccount(OWNER, "Ví");
    debt = await makeAccount(OWNER, "Nợ", "debt");
    linkedBank = await makeAccount(OWNER, "VCB", "bank");
    linkedBank2 = await makeAccount(OWNER, "TCB", "bank");
    archivedAcc = await makeAccount(OWNER, "Cũ", "cash", "archived");
    await db.insert(bankLinks).values([
      { userId: OWNER, accountId: linkedBank, gateway: "VCB", accountNumber: `${stamp}` },
      { userId: OWNER, accountId: linkedBank2, gateway: "TCB", accountNumber: `${stamp}` },
    ]);
    foodCat = await makeCategory(OWNER, "an", "expense");
    salaryCat = await makeCategory(OWNER, "luong", "income");
    archivedCat = await makeCategory(OWNER, "cu", "expense", true);
    const [g] = await db
      .insert(goals)
      .values({ userId: OWNER, name: "Quỹ", targetAmount: "1000000" })
      .returning({ id: goals.id });
    goalId = g!.id;
    otherAccount = await makeAccount(OTHER, "B ví");
    otherCategory = await makeCategory(OTHER, "b-an", "expense");
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [OWNER, OTHER]));
  });

  it("expense → transfer: R becomes the negative out-leg, a manual mirror lands on the target", async () => {
    const id = await makeTx({ accountId: cash, categoryId: foodCat, goalId, merchant: "Shop" });
    const [cashBefore, bankBefore] = [await balance(cash), await balance(bank)];

    await update({ id, kind: "transfer", amount: 100_000, fromAccountId: cash, toAccountId: bank });

    const r = await row(id);
    expect(r?.kind).toBe("transfer");
    expect(r?.amount).toBe("-100000");
    expect(r?.accountId).toBe(cash);
    expect(r?.categoryId).toBeNull();
    expect(r?.goalId).toBeNull();
    expect(r?.recurringRuleId).toBeNull();
    expect(r?.reviewStatus).toBe("confirmed");
    expect(r?.merchant).toBe("Shop"); // omitted merchant is kept
    const m = await row(r!.transferPairId!);
    expect(m?.amount).toBe("100000");
    expect(m?.accountId).toBe(bank);
    expect(m?.source).toBe("manual");
    expect(m?.transferPairId).toBe(id);
    // Expense of 100k → transfer out of 100k: cash unchanged, bank +100k.
    expect(await balance(cash)).toBe(cashBefore);
    expect(await balance(bank)).toBe(bankBefore + 100_000);
    await expectNoOrphanLegs();
  });

  it("income → transfer: R becomes the positive in-leg", async () => {
    const id = await makeTx({ accountId: bank, kind: "income", categoryId: salaryCat });
    await update({ id, kind: "transfer", amount: 100_000, fromAccountId: cash, toAccountId: bank });

    const r = await row(id);
    expect(r?.amount).toBe("100000");
    expect(r?.accountId).toBe(bank);
    const m = await row(r!.transferPairId!);
    expect(m?.amount).toBe("-100000");
    expect(m?.accountId).toBe(cash);
    await expectNoOrphanLegs();
  });

  it("transfer → expense from the in-leg: mate deleted, R kept and moved to the source account", async () => {
    const outId = await insertTransferAtomic(OWNER, {
      fromAccountId: cash,
      toAccountId: wallet,
      amount: 40_000,
      occurredAt: AT,
      note: null,
      clientOpId: crypto.randomUUID(),
    });
    const inId = (await row(outId))!.transferPairId!;
    const [cashBefore, walletBefore] = [await balance(cash), await balance(wallet)];

    await update({
      id: inId,
      kind: "expense",
      amount: 40_000,
      accountId: cash,
      categoryId: foodCat,
    });

    const r = await row(inId);
    expect(r?.id).toBe(inId);
    expect(r?.kind).toBe("expense");
    expect(r?.amount).toBe("40000");
    expect(r?.accountId).toBe(cash);
    expect(r?.categoryId).toBe(foodCat);
    expect(r?.transferPairId).toBeNull();
    expect(await row(outId)).toBeUndefined();
    // Was cash −40k / wallet +40k; now a 40k expense on cash only.
    expect(await balance(cash)).toBe(cashBefore);
    expect(await balance(wallet)).toBe(walletBefore - 40_000);
    await expectNoOrphanLegs();
  });

  it("transfer → transfer: amount and destination change on both legs", async () => {
    const outId = await insertTransferAtomic(OWNER, {
      fromAccountId: cash,
      toAccountId: bank,
      amount: 10_000,
      occurredAt: AT,
      note: null,
      clientOpId: crypto.randomUUID(),
    });
    await update({
      id: outId,
      kind: "transfer",
      amount: 25_000,
      fromAccountId: cash,
      toAccountId: wallet,
      note: "đổi",
    });
    const r = await row(outId);
    const m = await row(r!.transferPairId!);
    expect(r?.amount).toBe("-25000");
    expect(r?.accountId).toBe(cash);
    expect(m?.amount).toBe("25000");
    expect(m?.accountId).toBe(wallet);
    expect(m?.note).toBe("đổi");
    await expectNoOrphanLegs();
  });

  it("income ↔ expense still works and keeps merchant when omitted", async () => {
    const id = await makeTx({ accountId: cash, merchant: "Chợ" });
    await update({ id, kind: "income", amount: 5_000, accountId: cash, categoryId: salaryCat });
    const r = await row(id);
    expect(r?.kind).toBe("income");
    expect(r?.categoryId).toBe(salaryCat);
    expect(r?.merchant).toBe("Chợ");
  });

  it("pending bank-sync row → transfer (unlinked target): confirmed, keeps its account", async () => {
    const id = await makeTx({ accountId: bank, source: "bank_sync", reviewStatus: "pending" });
    await update({ id, kind: "transfer", amount: 100_000, fromAccountId: bank, toAccountId: cash });
    const r = await row(id);
    expect(r?.reviewStatus).toBe("confirmed");
    expect(r?.accountId).toBe(bank);
    // The inbox query (shared projection) still runs and no longer lists it.
    const pending = await listPendingTransactions(OWNER);
    expect(pending.map((p) => p.id)).not.toContain(id);
  });

  it("double-submitted expense → transfer yields exactly one mirror", async () => {
    const id = await makeTx({ accountId: cash });
    const input: UpdateTxInput = {
      id,
      kind: "transfer",
      amount: 100_000,
      fromAccountId: cash,
      toAccountId: wallet,
    };
    await Promise.all([update(input), update(input)]);
    const mirrors = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.transferPairId, id));
    expect(mirrors).toHaveLength(1);
    await expectNoOrphanLegs();
  });

  describe("guards", () => {
    it("rejects any transfer conversion touching a debt account", async () => {
      const id = await makeTx({ accountId: cash });
      await expect(
        update({ id, kind: "transfer", amount: 1_000, fromAccountId: cash, toAccountId: debt }),
      ).rejects.toThrow(/nợ/);
      const onDebt = await makeTx({ accountId: debt });
      await expect(
        update({
          id: onDebt,
          kind: "transfer",
          amount: 1_000,
          fromAccountId: debt,
          toAccountId: cash,
        }),
      ).rejects.toThrow(/nợ/);
      expect((await row(id))?.kind).toBe("expense");
    });

    it("rejects a bank-synced row → transfer onto a bank-linked account", async () => {
      const id = await makeTx({ accountId: bank, source: "bank_sync", reviewStatus: "pending" });
      await expect(
        update({
          id,
          kind: "transfer",
          amount: 100_000,
          fromAccountId: bank,
          toAccountId: linkedBank,
        }),
      ).rejects.toThrow(/Ghép chuyển khoản/);
    });

    it("rejects moving a bank-synced row to another account during a conversion", async () => {
      const id = await makeTx({ accountId: bank, source: "bank_sync" });
      await expect(
        update({ id, kind: "transfer", amount: 100_000, fromAccountId: cash, toAccountId: wallet }),
      ).rejects.toThrow(/đồng bộ ngân hàng/);
    });

    it("rejects transfer → expense when the mate is bank-synced or referenced by an event", async () => {
      const outId = await insertTransferAtomic(OWNER, {
        fromAccountId: cash,
        toAccountId: bank,
        amount: 1_000,
        occurredAt: AT,
        note: null,
        clientOpId: crypto.randomUUID(),
      });
      const inId = (await row(outId))!.transferPairId!;
      await db.insert(bankSyncEvents).values({
        userId: OWNER,
        sepayId: `evt-${stamp}`,
        transactionId: inId,
        status: "imported",
        payload: {},
      });
      await expect(
        update({ id: outId, kind: "expense", amount: 1_000, accountId: cash }),
      ).rejects.toThrow(/đồng bộ ngân hàng/);
      expect(await row(inId)).toBeDefined();
    });

    it("rejects an archived account or category the row doesn't already use", async () => {
      const id = await makeTx({ accountId: cash });
      await expect(
        update({ id, kind: "expense", amount: 1_000, accountId: archivedAcc }),
      ).rejects.toThrow(/lưu trữ/);
      await expect(
        update({ id, kind: "expense", amount: 1_000, accountId: cash, categoryId: archivedCat }),
      ).rejects.toThrow(/lưu trữ/);
    });

    it("keeps accepting the row's own archived category", async () => {
      const id = await makeTx({ accountId: cash, categoryId: archivedCat });
      await expect(
        update({ id, kind: "expense", amount: 2_000, accountId: cash, categoryId: archivedCat }),
      ).resolves.toBeUndefined();
    });

    it("protects both legs of an inbox-merged pair (manual source, events on the out-leg only)", async () => {
      const outId = await insertTransferAtomic(OWNER, {
        fromAccountId: linkedBank,
        toAccountId: linkedBank2,
        amount: 500_000,
        occurredAt: AT,
        note: null,
        clientOpId: crypto.randomUUID(),
      });
      const inId = (await row(outId))!.transferPairId!;
      await db.insert(bankSyncEvents).values([
        {
          userId: OWNER,
          sepayId: `merge-a-${stamp}`,
          transactionId: outId,
          status: "imported",
          payload: {},
        },
        {
          userId: OWNER,
          sepayId: `merge-b-${stamp}`,
          transactionId: outId,
          status: "imported",
          payload: {},
        },
      ]);

      const rejection = update({
        id: outId,
        kind: "expense",
        amount: 500_000,
        accountId: linkedBank,
      });
      await expect(rejection).rejects.toBeInstanceOf(TxEditRejection);
      await expect(
        update({
          id: outId,
          kind: "transfer",
          amount: 500_000,
          fromAccountId: linkedBank,
          toAccountId: cash,
        }),
      ).rejects.toThrow(/đồng bộ ngân hàng/);
      // Amount/note edits with both accounts unchanged stay allowed.
      await update({
        id: inId,
        kind: "transfer",
        amount: 500_000,
        fromAccountId: linkedBank,
        toAccountId: linkedBank2,
        note: "ghép",
      });
      expect((await row(outId))?.note).toBe("ghép");
      expect(await row(inId)).toBeDefined();
    });

    it("rejects moving a converted bank row's manual mirror onto a bank-linked account", async () => {
      const id = await makeTx({ accountId: bank, source: "bank_sync" });
      await update({
        id,
        kind: "transfer",
        amount: 100_000,
        fromAccountId: bank,
        toAccountId: cash,
      });
      const mirrorId = (await row(id))!.transferPairId!;
      await expect(
        update({
          id: mirrorId,
          kind: "transfer",
          amount: 100_000,
          fromAccountId: bank,
          toAccountId: linkedBank,
        }),
      ).rejects.toThrow(/Ghép chuyển khoản/);
      // An unlinked destination is fine.
      await update({
        id: mirrorId,
        kind: "transfer",
        amount: 100_000,
        fromAccountId: bank,
        toAccountId: wallet,
      });
      expect((await row(mirrorId))?.accountId).toBe(wallet);
    });

    it("lets an existing debt transfer change amount/note but not kind or accounts", async () => {
      const outId = await insertTransferAtomic(OWNER, {
        fromAccountId: cash,
        toAccountId: debt,
        amount: 10_000,
        occurredAt: AT,
        note: null,
        clientOpId: crypto.randomUUID(),
      });
      await update({
        id: outId,
        kind: "transfer",
        amount: 20_000,
        fromAccountId: cash,
        toAccountId: debt,
      });
      expect((await row(outId))?.amount).toBe("-20000");
      await expect(
        update({
          id: outId,
          kind: "transfer",
          amount: 20_000,
          fromAccountId: wallet,
          toAccountId: debt,
        }),
      ).rejects.toThrow(/nợ/);
      await expect(
        update({ id: outId, kind: "expense", amount: 20_000, accountId: cash }),
      ).rejects.toThrow(/nợ/);
    });

    it("rejects from === to at the schema", () => {
      expect(() =>
        updateTxSchema.parse({
          id: crypto.randomUUID(),
          kind: "transfer",
          amount: 1,
          fromAccountId: cash,
          toAccountId: cash,
        }),
      ).toThrow();
    });

    it("rejects another user's account or category (IDOR)", async () => {
      const outId = await insertTransferAtomic(OWNER, {
        fromAccountId: cash,
        toAccountId: bank,
        amount: 1_000,
        occurredAt: AT,
        note: null,
        clientOpId: crypto.randomUUID(),
      });
      await expect(
        update({
          id: outId,
          kind: "transfer",
          amount: 1_000,
          fromAccountId: cash,
          toAccountId: otherAccount,
        }),
      ).rejects.toThrow(/không tồn tại/);
      const id = await makeTx({ accountId: cash });
      await expect(
        update({ id, kind: "expense", amount: 1_000, accountId: cash, categoryId: otherCategory }),
      ).rejects.toThrow(/không tồn tại/);
      // And another user cannot edit OWNER's row at all.
      await expect(
        updateTransactionInDb(
          OTHER,
          updateTxSchema.parse({ id, kind: "expense", amount: 1, accountId: otherAccount }),
        ),
      ).rejects.toThrow(/Không tìm thấy/);
    });
  });
});
