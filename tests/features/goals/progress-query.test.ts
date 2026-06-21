import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, goals, transactions } from "@/lib/db/schema";
import { getGoalProgress, listGoalsWithProgress } from "@/features/goals/queries";

// Goal progress is computed from the ledger on every read (no denormalised cache),
// so a deleted/added tagged tx must change progress with NO recompute step.
// Runs against a live Neon branch (excluded from the unit suite).
const OWNER_ID = `test-goalprog-${Date.now()}`;
const OWNER_EMAIL = `goalprog-${Date.now()}@example.test`;
let accountId: string;
let goalId: string;

describe("goal progress query", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "GoalProg", email: OWNER_EMAIL, emailVerified: true });
    const [a] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Ví", type: "cash" })
      .returning({ id: accounts.id });
    accountId = a!.id;
    const [g] = await db
      .insert(goals)
      .values({ userId: OWNER_ID, name: "Du lịch Nhật", targetAmount: "30000000" })
      .returning({ id: goals.id });
    goalId = g!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("sums amounts tagged to the goal", async () => {
    // 5 deposits of 1,000,000 each, all tagged to the goal.
    for (let i = 0; i < 5; i++) {
      await db.insert(transactions).values({
        userId: OWNER_ID,
        accountId,
        goalId,
        kind: "income",
        amount: "1000000",
        occurredAt: new Date(`2026-06-${10 + i}T05:00:00Z`),
      });
    }
    // Plus one untagged tx that must NOT count.
    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId,
      kind: "income",
      amount: "9999999",
      occurredAt: new Date("2026-06-20T05:00:00Z"),
    });

    expect(await getGoalProgress(goalId, OWNER_ID)).toBe(5_000_000);

    const view = await listGoalsWithProgress(OWNER_ID);
    const row = view.goals.find((g) => g.id === goalId);
    expect(row?.progress).toBe(5_000_000);
    // 5M / 30M ≈ 0.1667, clamped fraction.
    expect(row?.ratio).toBeCloseTo(5_000_000 / 30_000_000);
  });

  it("auto-updates when a tagged tx is deleted (no cache)", async () => {
    const [first] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.goalId, goalId))
      .limit(1);
    await db.delete(transactions).where(eq(transactions.id, first!.id));

    // One deposit gone → progress drops by exactly that amount, no recompute call.
    expect(await getGoalProgress(goalId, OWNER_ID)).toBe(4_000_000);
  });

  it("scopes progress to the owning user", async () => {
    expect(await getGoalProgress(goalId, "someone-else")).toBe(0);
  });
});
