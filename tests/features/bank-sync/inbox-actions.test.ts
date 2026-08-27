import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const OWNER_ID = `test-inbox-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, bankLinks, bankSyncEvents, categories, transactions } from "@/lib/db/schema";
import {
  confirmManyTransactions,
  confirmTransaction,
  mergeAsTransfer,
  undoBulkConfirm,
} from "@/features/bank-sync/inbox-actions";
import {
  countPendingTransactions,
  listPendingTransactions,
} from "@/features/bank-sync/inbox-queries";
import { deleteTransaction } from "@/features/transactions/actions/delete";
import { listTransactions } from "@/features/transactions/queries";
import { listAccountsWithBalance } from "@/features/accounts/queries";
import { netCashFlowMtd } from "@/features/reports/queries";
import { currentIctMonth } from "@/lib/month";

const stamp = Date.now();
const OTHER_ID = `test-inbox-other-${stamp}`;
const MONTH = currentIctMonth();

let bankA: string;
let bankB: string;
let expenseCat: string;
let incomeCat: string;
let otherAccount: string;
let otherCat: string;

function thisMonthAt(day: number, hour = 5): Date {
  const [y, m] = MONTH.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, day, hour, 0, 0));
}

async function makePending(
  over: {
    accountId?: string;
    kind?: "income" | "expense";
    amount?: string;
    occurredAt?: Date;
    userId?: string;
    source?: "manual" | "bank_sync";
  } = {},
): Promise<string> {
  const [row] = await db
    .insert(transactions)
    .values({
      userId: over.userId ?? OWNER_ID,
      accountId: over.accountId ?? bankA,
      kind: over.kind ?? "expense",
      amount: over.amount ?? "250000",
      occurredAt: over.occurredAt ?? thisMonthAt(10),
      source: over.source ?? "bank_sync",
      reviewStatus: "pending",
    })
    .returning({ id: transactions.id });
  return row!.id;
}

describe("inbox actions", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: OWNER_ID, name: "Inbox", email: `inbox-${stamp}@example.test`, emailVerified: true },
      {
        id: OTHER_ID,
        name: "Other",
        email: `inbox-other-${stamp}@example.test`,
        emailVerified: true,
      },
    ]);

    const mkAccount = async (userId: string, name: string) => {
      const [a] = await db
        .insert(accounts)
        .values({ userId, name, type: "bank", initialBalance: "10000000" })
        .returning({ id: accounts.id });
      return a!.id;
    };
    bankA = await mkAccount(OWNER_ID, "NH A");
    bankB = await mkAccount(OWNER_ID, "NH B");
    otherAccount = await mkAccount(OTHER_ID, "NH khác");

    const mkCat = async (userId: string, name: string, kind: "income" | "expense") => {
      const [c] = await db
        .insert(categories)
        .values({ userId, name, slug: `${name}-${stamp}-${kind}`, kind })
        .returning({ id: categories.id });
      return c!.id;
    };
    expenseCat = await mkCat(OWNER_ID, "an-uong", "expense");
    incomeCat = await mkCat(OWNER_ID, "luong", "income");
    otherCat = await mkCat(OTHER_ID, "khac", "expense");
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
    await db.delete(user).where(eq(user.id, OTHER_ID));
  });

  beforeEach(async () => {
    await db.delete(transactions).where(eq(transactions.userId, OWNER_ID));
    await db.delete(transactions).where(eq(transactions.userId, OTHER_ID));
  });

  describe("confirmTransaction", () => {
    it("categorises the row without moving the balance", async () => {
      const id = await makePending();
      const before = (await listAccountsWithBalance(OWNER_ID)).find((a) => a.id === bankA)?.balance;

      const result = await confirmTransaction({ id, categoryId: expenseCat });
      expect(result.ok).toBe(true);

      const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
      expect(row?.reviewStatus).toBe("confirmed");
      expect(row?.categoryId).toBe(expenseCat);

      // Reviewing changes visibility, never money.
      const after = (await listAccountsWithBalance(OWNER_ID)).find((a) => a.id === bankA)?.balance;
      expect(after).toBe(before);

      expect((await listTransactions(OWNER_ID)).map((t) => t.id)).toContain(id);
      expect(await countPendingTransactions(OWNER_ID)).toBe(0);
    });

    it("reports a soft failure on a second confirm rather than throwing", async () => {
      const id = await makePending();
      await confirmTransaction({ id, categoryId: expenseCat });

      const second = await confirmTransaction({ id, categoryId: expenseCat });
      expect(second.ok).toBe(false);
      expect(second.message).toBeTruthy();
    });

    it("refuses a category of the wrong kind", async () => {
      const id = await makePending({ kind: "expense" });
      await expect(confirmTransaction({ id, categoryId: incomeCat })).rejects.toThrow();

      const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
      expect(row?.reviewStatus).toBe("pending");
    });

    it("refuses another user's category", async () => {
      const id = await makePending();
      await expect(confirmTransaction({ id, categoryId: otherCat })).rejects.toThrow();
    });
  });

  describe("confirmManyTransactions", () => {
    it("changes only the caller's pending rows", async () => {
      const mine1 = await makePending();
      const mine2 = await makePending();
      const theirs = await makePending({ userId: OTHER_ID, accountId: otherAccount });

      const { changed } = await confirmManyTransactions({
        ids: [mine1, mine2, theirs],
        categoryId: expenseCat,
      });
      expect(changed).toBe(2);

      const [foreign] = await db.select().from(transactions).where(eq(transactions.id, theirs));
      expect(foreign?.reviewStatus).toBe("pending");
      expect(foreign?.categoryId).toBeNull();
    });

    it("skips rows whose kind does not match the category", async () => {
      const expense = await makePending({ kind: "expense" });
      const income = await makePending({ kind: "income", amount: "900000" });

      const { changed } = await confirmManyTransactions({
        ids: [expense, income],
        categoryId: expenseCat,
      });
      expect(changed).toBe(1);

      const [untouched] = await db.select().from(transactions).where(eq(transactions.id, income));
      expect(untouched?.reviewStatus).toBe("pending");
    });

    it("rejects a batch over the cap", async () => {
      const ids = Array.from({ length: 101 }, () => crypto.randomUUID());
      await expect(confirmManyTransactions({ ids, categoryId: expenseCat })).rejects.toThrow();
    });
  });

  describe("undoBulkConfirm", () => {
    it("returns bulk-confirmed rows to pending", async () => {
      const a = await makePending();
      const b = await makePending();
      await confirmManyTransactions({ ids: [a, b], categoryId: expenseCat });

      const { reverted } = await undoBulkConfirm({ ids: [a, b] });
      expect(reverted).toBe(2);

      const rows = await db
        .select()
        .from(transactions)
        .where(inArray(transactions.id, [a, b]));
      for (const row of rows) {
        expect(row.reviewStatus).toBe("pending");
        expect(row.categoryId).toBeNull();
      }
    });

    it("never touches a manually entered transaction", async () => {
      // A manual row has no pending history to restore, so stripping its category
      // would be destructive rather than an undo.
      const [manual] = await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: bankA,
          categoryId: expenseCat,
          kind: "expense",
          amount: "80000",
          occurredAt: thisMonthAt(9),
        })
        .returning({ id: transactions.id });

      const { reverted } = await undoBulkConfirm({ ids: [manual!.id] });
      expect(reverted).toBe(0);

      const [row] = await db.select().from(transactions).where(eq(transactions.id, manual!.id));
      expect(row?.categoryId).toBe(expenseCat);
      expect(row?.reviewStatus).toBe("confirmed");
    });
  });

  describe("mergeAsTransfer", () => {
    it("replaces the two legs with a real transfer pair, leaving balances intact", async () => {
      const outId = await makePending({
        accountId: bankA,
        kind: "expense",
        amount: "2000000",
        occurredAt: thisMonthAt(12),
      });
      const inId = await makePending({
        accountId: bankB,
        kind: "income",
        amount: "2000000",
        occurredAt: thisMonthAt(12, 6),
      });

      const balancesBefore = await listAccountsWithBalance(OWNER_ID);
      const aBefore = balancesBefore.find((a) => a.id === bankA)?.balance;
      const bBefore = balancesBefore.find((a) => a.id === bankB)?.balance;

      // Before merging, the two legs are counted as genuine income AND genuine
      // spending — this is the distortion the merge exists to remove.
      const flowBefore = await netCashFlowMtd(OWNER_ID);
      expect(flowBefore.income).toBeGreaterThanOrEqual(2_000_000);
      expect(flowBefore.expense).toBeGreaterThanOrEqual(2_000_000);

      await mergeAsTransfer({ inId, outId });

      expect(
        await db
          .select()
          .from(transactions)
          .where(inArray(transactions.id, [inId, outId])),
      ).toHaveLength(0);

      const legs = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, OWNER_ID), eq(transactions.kind, "transfer")));
      expect(legs).toHaveLength(2);

      const out = legs.find((l) => Number(l.amount) < 0);
      const inc = legs.find((l) => Number(l.amount) > 0);
      expect(out?.accountId).toBe(bankA);
      expect(inc?.accountId).toBe(bankB);
      expect(out?.transferPairId).toBe(inc?.id);
      expect(inc?.transferPairId).toBe(out?.id);

      const balancesAfter = await listAccountsWithBalance(OWNER_ID);
      expect(balancesAfter.find((a) => a.id === bankA)?.balance).toBe(aBefore);
      expect(balancesAfter.find((a) => a.id === bankB)?.balance).toBe(bBefore);

      // Cash flow no longer double-counts an internal move.
      const flowAfter = await netCashFlowMtd(OWNER_ID);
      expect(flowAfter.income).toBe(flowBefore.income - 2_000_000);
      expect(flowAfter.expense).toBe(flowBefore.expense - 2_000_000);
    });

    it("re-points the journal rows at the surviving pair", async () => {
      const outId = await makePending({ accountId: bankA, kind: "expense", amount: "500000" });
      const inId = await makePending({ accountId: bankB, kind: "income", amount: "500000" });

      const [link] = await db
        .insert(bankLinks)
        .values({
          userId: OWNER_ID,
          accountId: bankA,
          gateway: `Bank-${stamp}`,
          accountNumber: `${stamp}`.slice(-10),
        })
        .returning({ id: bankLinks.id });

      const [event] = await db
        .insert(bankSyncEvents)
        .values({
          userId: OWNER_ID,
          sepayId: `merge-${stamp}-${Math.random()}`,
          status: "imported",
          payload: {},
          bankLinkId: link!.id,
          transactionId: outId,
        })
        .returning({ id: bankSyncEvents.id });

      const { pairId } = await mergeAsTransfer({ inId, outId });

      // The dedupe key lives on this row; if it were left dangling, a late SePay
      // retry would re-create the leg that was just merged away.
      const [after] = await db
        .select()
        .from(bankSyncEvents)
        .where(eq(bankSyncEvents.id, event!.id));
      expect(after?.transactionId).toBe(pairId);

      await db.delete(bankSyncEvents).where(eq(bankSyncEvents.id, event!.id));
      await db.delete(bankLinks).where(eq(bankLinks.id, link!.id));
    });

    it.each([
      [
        "amounts differing by a transfer fee",
        () => ({ outAmount: "1011000", inAmount: "1000000", sameAccount: false, dayGap: 0 }),
      ],
      [
        "the same account on both legs",
        () => ({ outAmount: "500000", inAmount: "500000", sameAccount: true, dayGap: 0 }),
      ],
      [
        "legs ten days apart",
        () => ({ outAmount: "500000", inAmount: "500000", sameAccount: false, dayGap: 10 }),
      ],
    ])("refuses %s and writes nothing", async (_label, setup) => {
      const { outAmount, inAmount, sameAccount, dayGap } = setup();
      const outId = await makePending({
        accountId: bankA,
        kind: "expense",
        amount: outAmount,
        occurredAt: thisMonthAt(5),
      });
      const inId = await makePending({
        accountId: sameAccount ? bankA : bankB,
        kind: "income",
        amount: inAmount,
        occurredAt: thisMonthAt(5 + dayGap),
      });

      await expect(mergeAsTransfer({ inId, outId })).rejects.toThrow();

      // Both legs survive untouched, and no transfer was invented.
      const survivors = await db
        .select()
        .from(transactions)
        .where(inArray(transactions.id, [inId, outId]));
      expect(survivors).toHaveLength(2);
      expect(survivors.every((s) => s.reviewStatus === "pending")).toBe(true);

      const transfers = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, OWNER_ID), eq(transactions.kind, "transfer")));
      expect(transfers).toHaveLength(0);
    });

    it("refuses to merge another user's row", async () => {
      const outId = await makePending({ accountId: bankA, kind: "expense", amount: "700000" });
      const theirs = await makePending({
        userId: OTHER_ID,
        accountId: otherAccount,
        kind: "income",
        amount: "700000",
      });

      await expect(mergeAsTransfer({ inId: theirs, outId })).rejects.toThrow();
      expect(await db.select().from(transactions).where(eq(transactions.id, theirs))).toHaveLength(
        1,
      );
    });
  });

  describe("deleting a pending row", () => {
    it("removes the transaction but keeps the journal row for dedupe", async () => {
      const id = await makePending();
      const sepayId = `del-${stamp}-${Math.random()}`;
      const [event] = await db
        .insert(bankSyncEvents)
        .values({
          userId: OWNER_ID,
          sepayId,
          status: "imported",
          payload: {},
          transactionId: id,
        })
        .returning({ id: bankSyncEvents.id });

      await deleteTransaction({ id });

      expect(await db.select().from(transactions).where(eq(transactions.id, id))).toHaveLength(0);

      const [survivingEvent] = await db
        .select()
        .from(bankSyncEvents)
        .where(eq(bankSyncEvents.id, event!.id));
      expect(survivingEvent).toBeDefined();
      expect(survivingEvent?.transactionId).toBeNull();

      // The dedupe key is still claimed, so a retry cannot resurrect the row.
      await expect(
        db.insert(bankSyncEvents).values({
          userId: OWNER_ID,
          sepayId,
          status: "received",
          payload: {},
        }),
      ).rejects.toThrow();

      await db.delete(bankSyncEvents).where(eq(bankSyncEvents.id, event!.id));
    });
  });

  describe("listPendingTransactions", () => {
    it("returns only pending rows, newest first", async () => {
      const older = await makePending({ occurredAt: thisMonthAt(3) });
      const newer = await makePending({ occurredAt: thisMonthAt(20) });
      const confirmed = await makePending({ occurredAt: thisMonthAt(15) });
      await confirmTransaction({ id: confirmed, categoryId: expenseCat });

      const rows = await listPendingTransactions(OWNER_ID);
      expect(rows.map((r) => r.id)).toEqual([newer, older]);
    });
  });
});
