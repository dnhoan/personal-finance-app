import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

// Stub the auth gate so the update/delete server actions run against the live DB
// as a fixed test user, and neutralise next/cache (no request context in vitest).
const OWNER_ID = `test-pending-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, budgets, categories, goals, transactions } from "@/lib/db/schema";
import {
  getTransactionDetail,
  listTransactions,
  summariseTransactions,
} from "@/features/transactions/queries";
import { updateTransaction } from "@/features/transactions/actions/update";
import { deleteTransaction } from "@/features/transactions/actions/delete";
import { loadUserTransactionsForExport } from "@/features/export/lib/transactions-csv-columns";
import {
  spendingByCategory,
  spendingTotalForRange,
} from "@/features/reports/spending-by-category-query";
import { netCashFlowMtd, topCategoriesThisMonth } from "@/features/reports/queries";
import { totalExpenseForMonth } from "@/features/categories/queries";
import { listBudgets } from "@/features/budgets/queries";
import { getGoalProgress } from "@/features/goals/queries";
import {
  getAccountMonthStats,
  getAccountPendingSummary,
  getAccountWithBalance,
  listAccountsWithBalance,
} from "@/features/accounts/queries";
import { currentIctMonth } from "@/lib/month";

// The whole point of the pending state: a bank-synced row COUNTS toward balances
// and cash flow (real money moved) but is INVISIBLE to the ledger, the export,
// and every category-based report until the user gives it a category.
//
// The fixture deliberately holds three expense rows so the two failure modes stay
// distinguishable:
//   100k confirmed WITH a category   → visible everywhere
//   300k pending   (no category)     → the row under test
//    50k confirmed WITHOUT category  → the app's PRE-EXISTING header-vs-breakdown
//                                      gap, which this feature neither causes nor
//                                      fixes. Asserting it explicitly stops a
//                                      future reader blaming it on pending.
const stamp = Date.now();
const OWNER_EMAIL = `pending-${stamp}@example.test`;
const MONTH = currentIctMonth();

let bankId: string;
let catId: string;
let goalId: string;
let confirmedId: string;
let pendingId: string;
let uncategorisedId: string;

// Every month-bucketed query under test reads the CURRENT ICT month from now(),
// so the fixture must sit inside it. Mid-month noon ICT keeps the row clear of
// both month boundaries regardless of when the suite runs.
function thisMonthAt(day: number): Date {
  const [y, m] = MONTH.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, day, 5, 0, 0));
}

// spendingByCategory/spendingTotalForRange take an explicit ICT date range.
const RANGE = { from: `${MONTH}-01`, to: `${MONTH}-28` };

describe("pending transactions are counted but not listed", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "Pending", email: OWNER_EMAIL, emailVerified: true });

    const [bank] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ngân hàng", type: "bank", initialBalance: "10000000" })
      .returning({ id: accounts.id });
    bankId = bank!.id;

    const [cat] = await db
      .insert(categories)
      .values({ userId: OWNER_ID, name: "Ăn uống", slug: `an-uong-${stamp}`, kind: "expense" })
      .returning({ id: categories.id });
    catId = cat!.id;

    const [goal] = await db
      .insert(goals)
      .values({ userId: OWNER_ID, name: "Quỹ", targetAmount: "10000000" })
      .returning({ id: goals.id });
    goalId = goal!.id;

    await db.insert(budgets).values({
      userId: OWNER_ID,
      categoryId: catId,
      periodMonth: `${MONTH}-01`,
      amount: "2000000",
    });

    const [confirmed] = await db
      .insert(transactions)
      .values({
        userId: OWNER_ID,
        accountId: bankId,
        categoryId: catId,
        kind: "expense",
        amount: "100000",
        occurredAt: thisMonthAt(10),
      })
      .returning({ id: transactions.id });
    confirmedId = confirmed!.id;

    const [pending] = await db
      .insert(transactions)
      .values({
        userId: OWNER_ID,
        accountId: bankId,
        kind: "expense",
        amount: "300000",
        occurredAt: thisMonthAt(11),
        source: "bank_sync",
        reviewStatus: "pending",
      })
      .returning({ id: transactions.id });
    pendingId = pending!.id;

    const [uncategorised] = await db
      .insert(transactions)
      .values({
        userId: OWNER_ID,
        accountId: bankId,
        kind: "expense",
        amount: "50000",
        occurredAt: thisMonthAt(12),
      })
      .returning({ id: transactions.id });
    uncategorisedId = uncategorised!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  describe("hidden from the ledger", () => {
    it("omits the pending row from listTransactions", async () => {
      const rows = await listTransactions(OWNER_ID);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(confirmedId);
      expect(ids).toContain(uncategorisedId);
      expect(ids).not.toContain(pendingId);
      expect(rows).toHaveLength(2);
    });

    it("omits it from the list summary", async () => {
      const summary = await summariseTransactions(OWNER_ID);
      expect(summary.expense).toBe(150_000);
      expect(summary.count).toBe(2);
    });

    it("omits it from the CSV export", async () => {
      const rows = await loadUserTransactionsForExport(OWNER_ID);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => Number(r.amount))).not.toContain(300_000);
    });
  });

  describe("hidden from category reporting", () => {
    it("omits it from the spending header total", async () => {
      // 150k, not 100k: the uncategorised confirmed row still belongs in a
      // header total. That header/breakdown gap is pre-existing, not pending.
      expect(await spendingTotalForRange(OWNER_ID, RANGE)).toBe(150_000);
    });

    it("omits it from the donut breakdown", async () => {
      const breakdown = await spendingByCategory(OWNER_ID, RANGE);
      expect(breakdown.total).toBe(100_000);
    });

    it("omits it from the categories-page month total", async () => {
      expect(await totalExpenseForMonth(OWNER_ID, MONTH)).toBe(150_000);
    });

    it("omits it from the top-categories list", async () => {
      const top = await topCategoriesThisMonth(OWNER_ID);
      expect(top.reduce((sum, c) => sum + c.total, 0)).toBe(100_000);
    });

    it("omits it from budget spend", async () => {
      const { rows } = await listBudgets(OWNER_ID, MONTH);
      expect(rows.find((r) => r.categoryId === catId)?.spent).toBe(100_000);
    });

    it("leaves goal progress untouched", async () => {
      // The webhook never tags a goal, so a pending row cannot reach this query.
      expect(await getGoalProgress(goalId, OWNER_ID)).toBe(0);
    });
  });

  describe("counted in balances and cash flow", () => {
    it("subtracts it from the account balance", async () => {
      // 10,000,000 − 100k − 300k − 50k
      const account = await getAccountWithBalance(OWNER_ID, bankId);
      expect(account?.balance).toBe(9_550_000);

      const listed = (await listAccountsWithBalance(OWNER_ID)).find((a) => a.id === bankId);
      expect(listed?.balance).toBe(9_550_000);
    });

    it("includes it in the account's month stats", async () => {
      const stats = await getAccountMonthStats(OWNER_ID, bankId);
      expect(stats.moneyOut).toBe(450_000);
    });

    it("includes it in month-to-date cash flow", async () => {
      const flow = await netCashFlowMtd(OWNER_ID);
      expect(flow.expense).toBe(450_000);
    });

    it("reports it on the account page's pending notice", async () => {
      const summary = await getAccountPendingSummary(OWNER_ID, bankId);
      expect(summary.count).toBe(1);
      expect(summary.total).toBe(-300_000);
    });
  });

  describe("reachable and reviewable", () => {
    it("still opens on the detail page", async () => {
      // The inbox deep-links straight here, so this read must NOT be filtered.
      const detail = await getTransactionDetail(OWNER_ID, pendingId);
      expect(detail).not.toBeNull();
      expect(detail?.amount).toBe(300_000);
      expect(detail?.categoryId).toBeNull();
    });

    it("keeps the row pending when an edit leaves the category empty", async () => {
      // Editing only the note must not smuggle the row into the ledger — and the
      // `review_status = review_status` no-op branch has to be valid SQL.
      await updateTransaction({
        id: pendingId,
        kind: "expense",
        amount: 300_000,
        accountId: bankId,
        occurredAt: thisMonthAt(11),
        note: "Chưa phân loại",
      });

      const [row] = await db
        .select({ reviewStatus: transactions.reviewStatus, note: transactions.note })
        .from(transactions)
        .where(eq(transactions.id, pendingId));
      expect(row?.reviewStatus).toBe("pending");
      expect(row?.note).toBe("Chưa phân loại");
      expect((await listTransactions(OWNER_ID)).map((r) => r.id)).not.toContain(pendingId);
    });

    it("confirms the row when an edit assigns a category", async () => {
      await updateTransaction({
        id: pendingId,
        kind: "expense",
        amount: 300_000,
        accountId: bankId,
        categoryId: catId,
        occurredAt: thisMonthAt(11),
      });

      const [row] = await db
        .select({ reviewStatus: transactions.reviewStatus })
        .from(transactions)
        .where(eq(transactions.id, pendingId));
      expect(row?.reviewStatus).toBe("confirmed");

      // Now in the ledger, and the balance is unchanged by the review.
      const ids = (await listTransactions(OWNER_ID)).map((r) => r.id);
      expect(ids).toContain(pendingId);
      const account = await getAccountWithBalance(OWNER_ID, bankId);
      expect(account?.balance).toBe(9_550_000);
    });

    it("deletes a pending row through the ordinary delete action", async () => {
      const [fresh] = await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: bankId,
          kind: "expense",
          amount: "70000",
          occurredAt: thisMonthAt(13),
          source: "bank_sync",
          reviewStatus: "pending",
        })
        .returning({ id: transactions.id });

      await deleteTransaction({ id: fresh!.id });

      const remaining = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.id, fresh!.id));
      expect(remaining).toHaveLength(0);
    });
  });
});
