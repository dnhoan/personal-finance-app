import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import {
  accounts,
  categories,
  transactions,
  recurringRules,
  budgets,
  goals,
  cronState,
  bankSyncTokens,
  bankLinks,
  bankSyncEvents,
} from "@/lib/db/schema";

// Round-trips one row through every domain table against a live Neon branch:
// insert → select → FK behaviour (restrict + set-null) → TZ-boundary generated
// column. All rows hang off a single throwaway owner; afterAll cascades cleanup.
//
// Requires DATABASE_URL pointing at a disposable Neon branch (loaded by tests/setup.ts).
const OWNER_ID = `test-owner-${Date.now()}`;
const OWNER_EMAIL = `roundtrip-${Date.now()}@example.test`;

// Unwraps the first row from a query, failing loudly if the set is empty
// (satisfies noUncheckedIndexedAccess without scattering non-null assertions).
function row<T>(rows: T[]): T {
  const [r] = rows;
  if (r === undefined) throw new Error("expected at least one row");
  return r;
}

async function ownerAccount() {
  return row(await db.select().from(accounts).where(eq(accounts.userId, OWNER_ID)).limit(1));
}

describe("schema round-trip", () => {
  beforeAll(async () => {
    await db.insert(user).values({
      id: OWNER_ID,
      name: "Round Trip",
      email: OWNER_EMAIL,
      emailVerified: true,
    });
  });

  afterAll(async () => {
    // Cascades through accounts/categories/transactions/etc. via user_id FK.
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("inserts and reads an account", async () => {
    const acct = row(
      await db
        .insert(accounts)
        .values({ userId: OWNER_ID, name: "Tiền mặt", type: "cash", initialBalance: "1000000" })
        .returning(),
    );
    expect(acct.currency).toBe("VND");
    expect(acct.status).toBe("open");
    // numeric(18,0) returns a string — no JS float precision loss.
    expect(acct.initialBalance).toBe("1000000");
  });

  it("inserts a hierarchical category tree", async () => {
    const root = row(
      await db
        .insert(categories)
        .values({ userId: OWNER_ID, name: "Ăn uống", slug: "an-uong" })
        .returning(),
    );
    const child = row(
      await db
        .insert(categories)
        .values({ userId: OWNER_ID, name: "Cà phê", slug: "ca-phe", parentId: root.id })
        .returning(),
    );
    expect(child.parentId).toBe(root.id);
  });

  it("round-trips a large VND amount without precision loss", async () => {
    const acct = await ownerAccount();
    const big = "9999999999";
    const tx = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "income",
          amount: big,
          occurredAt: new Date("2026-06-15T03:00:00Z"),
        })
        .returning(),
    );
    expect(tx.amount).toBe(big);
  });

  it("derives occurred_month_ict in Asia/Ho_Chi_Minh time", async () => {
    const acct = await ownerAccount();
    // 2026-06-01 06:30 ICT == 2026-05-31 23:30 UTC → must bucket to June, not May.
    const tx = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "expense",
          amount: "50000",
          occurredAt: new Date("2026-05-31T23:30:00Z"),
        })
        .returning(),
    );
    expect(tx.occurredMonthIct).toBe("2026-06-01");
  });

  it("links a transfer pair via self-FK", async () => {
    const acct = await ownerAccount();
    const occurredAt = new Date("2026-06-10T05:00:00Z");
    const out = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "transfer",
          amount: "200000",
          occurredAt,
        })
        .returning(),
    );
    const incoming = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "transfer",
          amount: "200000",
          occurredAt,
          transferPairId: out.id,
        })
        .returning(),
    );
    expect(incoming.transferPairId).toBe(out.id);
  });

  it("enforces client_op_id idempotency", async () => {
    const acct = await ownerAccount();
    const clientOpId = crypto.randomUUID();
    const base = {
      userId: OWNER_ID,
      accountId: acct.id,
      kind: "expense" as const,
      amount: "1000",
      occurredAt: new Date("2026-06-11T05:00:00Z"),
      clientOpId,
    };
    await db.insert(transactions).values(base);
    await db.insert(transactions).values(base).onConflictDoNothing();
    const dupes = await db
      .select()
      .from(transactions)
      .where(eq(transactions.clientOpId, clientOpId));
    expect(dupes).toHaveLength(1);
  });

  it("round-trips recurring rule, budget, and goal", async () => {
    const acct = await ownerAccount();
    const cat = row(
      await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, OWNER_ID), eq(categories.slug, "an-uong")))
        .limit(1),
    );

    const rule = row(
      await db
        .insert(recurringRules)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          categoryId: cat.id,
          kind: "expense",
          amount: "300000",
          rrule: "FREQ=MONTHLY;INTERVAL=1",
          nextDue: "2026-07-01",
        })
        .returning(),
    );
    expect(rule.leadDays).toBe(3);
    expect(rule.active).toBe(true);

    const budget = row(
      await db
        .insert(budgets)
        .values({
          userId: OWNER_ID,
          categoryId: cat.id,
          periodMonth: "2026-06-01",
          amount: "2000000",
        })
        .returning(),
    );
    expect(budget.rollover).toBe(false);

    const goal = row(
      await db
        .insert(goals)
        .values({
          userId: OWNER_ID,
          name: "Du lịch",
          targetAmount: "10000000",
          accountId: acct.id,
        })
        .returning(),
    );
    expect(goal.archivedAt).toBeNull();
  });

  it("RESTRICTs deleting an account that has transactions", async () => {
    const acct = await ownerAccount();
    await expect(db.delete(accounts).where(eq(accounts.id, acct.id))).rejects.toThrow();
  });

  it("seeds a single cron_state row", async () => {
    await db.insert(cronState).values({ id: true }).onConflictDoNothing();
    const rows = await db.select().from(cronState);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // CHECK(id) pins the singleton to id = true.
    expect(rows.every((r) => r.id === true)).toBe(true);
  });

  it("rejects a second cron_state row (singleton CHECK)", async () => {
    await expect(db.execute(sql`INSERT INTO cron_state (id) VALUES (false)`)).rejects.toThrow();
  });

  it("defaults a transaction to manual + confirmed", async () => {
    const acct = await ownerAccount();
    const tx = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "expense",
          amount: "25000",
          occurredAt: new Date("2026-06-12T05:00:00Z"),
        })
        .returning(),
    );
    // The migration is additive: every pre-existing row reads as a confirmed
    // manual entry, so nothing changes until the webhook writes otherwise.
    expect(tx.source).toBe("manual");
    expect(tx.reviewStatus).toBe("confirmed");
  });

  it("allows only one unrevoked bank sync token per user", async () => {
    const first = row(
      await db
        .insert(bankSyncTokens)
        .values({ userId: OWNER_ID, tokenHash: `hash-a-${Date.now()}`, label: "SePay chính" })
        .returning(),
    );
    expect(first.revokedAt).toBeNull();

    await expect(
      db.insert(bankSyncTokens).values({ userId: OWNER_ID, tokenHash: `hash-b-${Date.now()}` }),
    ).rejects.toThrow();

    // Revoking releases the slot — rotation is revoke-then-insert.
    await db
      .update(bankSyncTokens)
      .set({ revokedAt: new Date() })
      .where(eq(bankSyncTokens.id, first.id));
    const second = row(
      await db
        .insert(bankSyncTokens)
        .values({ userId: OWNER_ID, tokenHash: `hash-c-${Date.now()}` })
        .returning(),
    );
    expect(second.revokedAt).toBeNull();
  });

  it("round-trips a bank link and rejects a duplicate (gateway, account number)", async () => {
    const acct = await ownerAccount();
    const link = row(
      await db
        .insert(bankLinks)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          gateway: "Vietcombank",
          accountNumber: "0123456789",
        })
        .returning(),
    );
    expect(link.lastBankBalance).toBeNull();
    expect(link.lastSyncedAt).toBeNull();

    await expect(
      db.insert(bankLinks).values({
        userId: OWNER_ID,
        accountId: acct.id,
        gateway: "Vietcombank",
        accountNumber: "0123456789",
      }),
    ).rejects.toThrow();
  });

  it("dedupes bank sync events on (user, sepay id)", async () => {
    const sepayId = `sepay-${Date.now()}`;
    await db
      .insert(bankSyncEvents)
      .values({ userId: OWNER_ID, sepayId, status: "received", payload: { id: sepayId } });

    // SePay retries the same event up to 7 times; the second write must not land.
    await expect(
      db
        .insert(bankSyncEvents)
        .values({ userId: OWNER_ID, sepayId, status: "received", payload: { id: sepayId } }),
    ).rejects.toThrow();

    const rows = await db
      .select()
      .from(bankSyncEvents)
      .where(and(eq(bankSyncEvents.userId, OWNER_ID), eq(bankSyncEvents.sepayId, sepayId)));
    expect(rows).toHaveLength(1);
    expect(row(rows).transactionId).toBeNull();
  });

  it("nulls a bank sync event's transaction id when the transaction is deleted", async () => {
    const acct = await ownerAccount();
    const tx = row(
      await db
        .insert(transactions)
        .values({
          userId: OWNER_ID,
          accountId: acct.id,
          kind: "income",
          amount: "500000",
          occurredAt: new Date("2026-06-13T05:00:00Z"),
          source: "bank_sync",
          reviewStatus: "pending",
        })
        .returning(),
    );
    expect(tx.source).toBe("bank_sync");
    expect(tx.reviewStatus).toBe("pending");

    const sepayId = `sepay-del-${Date.now()}`;
    const event = row(
      await db
        .insert(bankSyncEvents)
        .values({
          userId: OWNER_ID,
          sepayId,
          status: "imported",
          payload: { id: sepayId },
          transactionId: tx.id,
        })
        .returning(),
    );
    expect(event.transactionId).toBe(tx.id);

    await db.delete(transactions).where(eq(transactions.id, tx.id));
    const after = row(
      await db.select().from(bankSyncEvents).where(eq(bankSyncEvents.id, event.id)),
    );
    // ON DELETE SET NULL keeps the audit row: `imported` + NULL reads as
    // "the user deleted it", which is why skipped_zero_amount is a separate status.
    expect(after.transactionId).toBeNull();
    expect(after.status).toBe("imported");
  });
});
