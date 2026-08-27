import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, bankLinks, bankSyncEvents, bankSyncTokens, transactions } from "@/lib/db/schema";
import { POST } from "@/app/api/webhooks/sepay/route";
import { hashToken, generateWebhookToken } from "@/features/bank-sync/lib/token";
import { _resetWebhookRateLimit } from "@/server/webhooks/rate-limit";
import { ingestSepayEvent } from "@/server/webhooks/sepay/ingest-event";
import { sepayWebhookSchema } from "@/server/webhooks/sepay/payload-schema";
import { reprocessUnmatchedEvents } from "@/server/webhooks/sepay/reprocess-unmatched-events";
import { listTransactions } from "@/features/transactions/queries";
import { listAccountsWithBalance } from "@/features/accounts/queries";

// End-to-end webhook behaviour against a live Neon branch: auth rejection order,
// dedupe across retries, account mapping, TZ bucketing, and the balance
// ordering guard.
const stamp = Date.now();
const A_ID = `test-wh-a-${stamp}`;
const B_ID = `test-wh-b-${stamp}`;

let aAccountId: string;
let bAccountId: string;
let aLinkId: string;
let aToken: string;
let bToken: string;

const GATEWAY = "Vietcombank";
const A_NUMBER = "0123456789";

let seq = 0;
function payload(over: Record<string, unknown> = {}) {
  seq++;
  return {
    id: `${stamp}-${seq}`,
    gateway: GATEWAY,
    transactionDate: "2026-08-15 10:30:00",
    accountNumber: A_NUMBER,
    transferType: "in",
    transferAmount: 500_000,
    content: "Thanh toan hoa don",
    accumulated: 19_077_000,
    ...over,
  };
}

function post(body: unknown, token: string | null, headers: Record<string, string> = {}) {
  const raw = JSON.stringify(body);
  return POST(
    new Request("https://app.test/api/webhooks/sepay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(raw)),
        ...(token ? { authorization: `Apikey ${token}` } : {}),
        ...headers,
      },
      body: raw,
    }),
  );
}

async function issueToken(userId: string): Promise<string> {
  const raw = generateWebhookToken();
  await db.insert(bankSyncTokens).values({ userId, tokenHash: hashToken(raw) });
  return raw;
}

describe("SePay webhook ingest", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: A_ID, name: "A", email: `wh-a-${stamp}@example.test`, emailVerified: true },
      { id: B_ID, name: "B", email: `wh-b-${stamp}@example.test`, emailVerified: true },
    ]);

    const [a] = await db
      .insert(accounts)
      .values({ userId: A_ID, name: "NH A", type: "bank", initialBalance: "10000000" })
      .returning({ id: accounts.id });
    aAccountId = a!.id;

    const [b] = await db
      .insert(accounts)
      .values({ userId: B_ID, name: "NH B", type: "bank" })
      .returning({ id: accounts.id });
    bAccountId = b!.id;

    const [link] = await db
      .insert(bankLinks)
      .values({
        userId: A_ID,
        accountId: aAccountId,
        gateway: GATEWAY,
        accountNumber: A_NUMBER,
      })
      .returning({ id: bankLinks.id });
    aLinkId = link!.id;

    aToken = await issueToken(A_ID);
    bToken = await issueToken(B_ID);
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, A_ID));
    await db.delete(user).where(eq(user.id, B_ID));
  });

  beforeEach(() => _resetWebhookRateLimit());

  describe("authentication", () => {
    it("rejects a missing header, a bad scheme, and a bad token", async () => {
      expect((await post(payload(), null)).status).toBe(401);

      const raw = JSON.stringify(payload());
      const bearer = await POST(
        new Request("https://app.test/api/webhooks/sepay", {
          method: "POST",
          headers: { authorization: `Bearer ${aToken}`, "content-length": String(raw.length) },
          body: raw,
        }),
      );
      expect(bearer.status).toBe(401);

      expect((await post(payload(), "pfa_not-a-real-token")).status).toBe(401);
    });

    it("rejects an oversized token without hashing or touching the DB", async () => {
      // A 10KB "token" must die on the length check. If it reached the digest
      // lookup, this endpoint would be a free query generator for anonymous callers.
      const res = await post(payload(), "x".repeat(10_000));
      expect(res.status).toBe(401);
    });

    it("rejects a revoked token", async () => {
      // Inserted already-revoked: the one-active-token partial index deliberately
      // ignores revoked rows, which is what makes rotation possible at all.
      const doomed = generateWebhookToken();
      await db.insert(bankSyncTokens).values({
        userId: A_ID,
        tokenHash: hashToken(doomed),
        revokedAt: new Date(),
      });

      expect((await post(payload(), doomed)).status).toBe(401);
    });

    it("rejects a body over the size cap before reading it", async () => {
      const res = await post(payload(), aToken, { "content-length": String(17 * 1024) });
      expect(res.status).toBe(413);
    });

    it("writes nothing at all for an unauthenticated call", async () => {
      const before = await db.select().from(bankSyncEvents).where(eq(bankSyncEvents.userId, A_ID));
      await post(payload(), "pfa_wrong");
      const after = await db.select().from(bankSyncEvents).where(eq(bankSyncEvents.userId, A_ID));
      expect(after.length).toBe(before.length);
    });
  });

  describe("payload validation", () => {
    it("rejects a non-ISO date and journals nothing", async () => {
      const body = payload({ transactionDate: "25/03/2023 14:02" });
      const res = await post(body, aToken);
      expect(res.status).toBe(400);

      // 400 happens before the audit write, so there must be no trace at all.
      const events = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(events).toHaveLength(0);
    });

    it("rejects a well-formed but impossible date", async () => {
      expect((await post(payload({ transactionDate: "2026-13-45 10:00:00" }), aToken)).status).toBe(
        400,
      );
    });

    it("rejects an unknown transferType and a negative amount", async () => {
      expect((await post(payload({ transferType: "sideways" }), aToken)).status).toBe(400);
      expect((await post(payload({ transferAmount: -5 }), aToken)).status).toBe(400);
    });
  });

  describe("import", () => {
    it("creates one pending transaction mapped to the linked account", async () => {
      const body = payload({ transferAmount: 750_000, content: "Luong thang 8" });
      const res = await post(body, aToken);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ success: true });

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(event?.status).toBe("imported");

      const [tx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, event!.transactionId!));
      expect(tx?.accountId).toBe(aAccountId);
      expect(tx?.kind).toBe("income");
      expect(tx?.amount).toBe("750000");
      expect(tx?.reviewStatus).toBe("pending");
      expect(tx?.source).toBe("bank_sync");
      expect(tx?.categoryId).toBeNull();
      expect(tx?.note).toBe("Luong thang 8");
    });

    it("maps an outgoing transfer to an expense", async () => {
      const body = payload({ transferType: "out", transferAmount: 120_000 });
      await post(body, aToken);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      const [tx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, event!.transactionId!));
      expect(tx?.kind).toBe("expense");
    });

    it("records a zero-amount notification without creating a transaction", async () => {
      const body = payload({ transferAmount: 0 });
      expect((await post(body, aToken)).status).toBe(200);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(event?.status).toBe("skipped_zero_amount");
      expect(event?.transactionId).toBeNull();
    });

    it("keeps a pending row out of the ledger but inside the balance", async () => {
      const before =
        (await listAccountsWithBalance(A_ID)).find((a) => a.id === aAccountId)?.balance ?? 0;

      const body = payload({ transferType: "out", transferAmount: 200_000 });
      await post(body, aToken);

      const after =
        (await listAccountsWithBalance(A_ID)).find((a) => a.id === aAccountId)?.balance ?? 0;
      expect(after).toBe(before - 200_000);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      const ledgerIds = (await listTransactions(A_ID)).map((t) => t.id);
      expect(ledgerIds).not.toContain(event!.transactionId);
    });
  });

  describe("idempotency", () => {
    it("creates one transaction across three deliveries of the same event", async () => {
      const body = payload();
      for (let i = 0; i < 3; i++) {
        expect((await post(body, aToken)).status).toBe(200);
      }

      const events = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(events).toHaveLength(1);

      const txs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, A_ID),
            eq(transactions.occurredAt, new Date("2026-08-15T03:30:00Z")),
          ),
        );
      expect(txs.filter((t) => t.amount === "500000")).toHaveLength(1);
    });

    it("does not resurrect a transaction the user deleted", async () => {
      const body = payload({ transferAmount: 333_000 });
      await post(body, aToken);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      const deletedId = event!.transactionId!;
      await db.delete(transactions).where(eq(transactions.id, deletedId));

      // A late retry must stay a no-op — the dedupe key lives on the journal row,
      // which is exactly why it is not stored on `transactions`.
      expect((await post(body, aToken)).status).toBe(200);
      expect(
        await db.select().from(transactions).where(eq(transactions.id, deletedId)),
      ).toHaveLength(0);

      const [after] = await db
        .select()
        .from(bankSyncEvents)
        .where(eq(bankSyncEvents.id, event!.id));
      expect(after?.transactionId).toBeNull();
    });
  });

  describe("tenant isolation", () => {
    it("never writes into another user's account", async () => {
      // B's token, A's account number: B has no such link, so this is unmatched.
      const body = payload();
      expect((await post(body, bToken)).status).toBe(200);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, B_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(event?.status).toBe("unmatched");
      expect(event?.transactionId).toBeNull();

      const intoA = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, B_ID), eq(transactions.accountId, aAccountId)));
      expect(intoA).toHaveLength(0);
      expect(bAccountId).not.toBe(aAccountId);
    });
  });

  describe("ICT month bucketing", () => {
    it.each([
      ["2026-08-31 23:30:00", "2026-08-01"],
      ["2026-09-01 00:30:00", "2026-09-01"],
    ])("buckets %s into %s", async (transactionDate, expectedMonth) => {
      const body = payload({ transactionDate, transferAmount: 11_000 });
      await post(body, aToken);

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      const [tx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, event!.transactionId!));
      expect(tx?.occurredMonthIct).toBe(expectedMonth);
    });
  });

  describe("bank balance ordering guard", () => {
    it("does not let a late retry of an older event overwrite a newer balance", async () => {
      await db
        .update(bankLinks)
        .set({ lastBankBalance: null, lastSyncedAt: null })
        .where(eq(bankLinks.id, aLinkId));

      // Newer event lands first.
      await post(
        payload({ transactionDate: "2026-08-20 12:00:00", accumulated: 5_000_000 }),
        aToken,
      );
      // Then the delayed retry of an OLDER event arrives.
      await post(
        payload({ transactionDate: "2026-08-19 12:00:00", accumulated: 1_000_000 }),
        aToken,
      );

      const [link] = await db.select().from(bankLinks).where(eq(bankLinks.id, aLinkId));
      expect(Number(link?.lastBankBalance)).toBe(5_000_000);
    });
  });

  describe("unmatched replay", () => {
    it("imports stranded events once the account number is corrected", async () => {
      const typo = "9999999999";
      const body = payload({ accountNumber: typo, transferAmount: 640_000 });
      await post(body, aToken);

      const [stranded] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, String(body.id))));
      expect(stranded?.status).toBe("unmatched");

      // The user notices the typo and adds the correct mapping.
      const [fixed] = await db
        .insert(bankLinks)
        .values({
          userId: A_ID,
          accountId: aAccountId,
          gateway: GATEWAY,
          accountNumber: typo,
        })
        .returning({ id: bankLinks.id });

      const result = await reprocessUnmatchedEvents(db, A_ID);
      expect(result.imported).toBeGreaterThanOrEqual(1);

      const [replayed] = await db
        .select()
        .from(bankSyncEvents)
        .where(eq(bankSyncEvents.id, stranded!.id));
      expect(replayed?.status).toBe("imported");
      expect(replayed?.transactionId).not.toBeNull();
      expect(replayed?.bankLinkId).toBe(fixed!.id);

      const [tx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, replayed!.transactionId!));
      expect(tx?.amount).toBe("640000");
      expect(tx?.reviewStatus).toBe("pending");
    });

    it("is a no-op when nothing is unmatched", async () => {
      await reprocessUnmatchedEvents(db, A_ID);
      const result = await reprocessUnmatchedEvents(db, A_ID);
      expect(result.imported).toBe(0);
    });
  });

  describe("journal survives a failed ledger write", () => {
    it("keeps the audit row with status 'received' when the ledger write throws", async () => {
      // The journal row is committed in its OWN transaction, ahead of any
      // business logic, precisely so a rollback here cannot erase the only
      // record of the delivery. Forcing the ledger transaction to throw is the
      // direct way to prove that separation actually holds.
      const failingDb = new Proxy(db, {
        get(target, prop, receiver) {
          if (prop === "transaction") {
            return () => Promise.reject(new Error("simulated ledger failure"));
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as typeof db;

      const body = sepayWebhookSchema.parse(payload({ transferAmount: 480_000 }));

      await expect(ingestSepayEvent(failingDb, A_ID, body)).rejects.toThrow(
        "simulated ledger failure",
      );

      const [event] = await db
        .select()
        .from(bankSyncEvents)
        .where(and(eq(bankSyncEvents.userId, A_ID), eq(bankSyncEvents.sepayId, body.id)));

      expect(event).toBeDefined();
      expect(event?.status).toBe("received");
      expect(event?.transactionId).toBeNull();

      // And the retry that follows still finds the dedupe key, so it cannot
      // double-post once the underlying fault clears.
      const retry = await ingestSepayEvent(db, A_ID, body);
      expect(retry.status).toBe("duplicate");
    });
  });
});
