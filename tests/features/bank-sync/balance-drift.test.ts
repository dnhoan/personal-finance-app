import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, bankLinks, transactions } from "@/lib/db/schema";
import { getBalanceDrift, isSyncStale } from "@/features/bank-sync/balance-drift";
import { getAccountWithBalance, listAccountsWithBalance } from "@/features/accounts/queries";

const stamp = Date.now();
const OWNER_ID = `test-drift-${stamp}`;

let bankAccountId: string;
let cardAccountId: string;
let bankLinkId: string;
let cardLinkId: string;

const DAY = 86_400_000;

describe("balance drift", () => {
  beforeAll(async () => {
    await db.insert(user).values({
      id: OWNER_ID,
      name: "Drift",
      email: `drift-${stamp}@example.test`,
      emailVerified: true,
    });

    const [bank] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "NH", type: "bank", initialBalance: "5000000" })
      .returning({ id: accounts.id });
    bankAccountId = bank!.id;

    const [card] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Thẻ", type: "credit_card", initialBalance: "0" })
      .returning({ id: accounts.id });
    cardAccountId = card!.id;

    const [bl] = await db
      .insert(bankLinks)
      .values({
        userId: OWNER_ID,
        accountId: bankAccountId,
        gateway: "Vietcombank",
        accountNumber: "1111111111",
      })
      .returning({ id: bankLinks.id });
    bankLinkId = bl!.id;

    const [cl] = await db
      .insert(bankLinks)
      .values({
        userId: OWNER_ID,
        accountId: cardAccountId,
        gateway: "Vietcombank",
        accountNumber: "2222222222",
      })
      .returning({ id: bankLinks.id });
    cardLinkId = cl!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  beforeEach(async () => {
    await db.delete(transactions).where(eq(transactions.userId, OWNER_ID));
    await db
      .update(bankLinks)
      .set({ lastBankBalance: null, lastSyncedAt: null })
      .where(eq(bankLinks.userId, OWNER_ID));
  });

  async function driftFor(linkId: string) {
    return (await getBalanceDrift(OWNER_ID)).find((d) => d.bankLinkId === linkId);
  }

  it("returns no comparison until the bank has reported a balance", async () => {
    const row = await driftFor(bankLinkId);
    expect(row?.lastBankBalance).toBeNull();
    expect(row?.drift).toBeNull();
    expect(row?.showBadge).toBe(false);
  });

  it("reports zero drift when the bank agrees", async () => {
    await db
      .update(bankLinks)
      .set({ lastBankBalance: "5000000", lastSyncedAt: new Date() })
      .where(eq(bankLinks.id, bankLinkId));

    const row = await driftFor(bankLinkId);
    expect(row?.derivedBalance).toBe(5_000_000);
    expect(row?.drift).toBe(0);
    expect(row?.showBadge).toBe(true);
  });

  it("counts pending rows in the derived balance", async () => {
    // Consistent with Phase 2: pending money has genuinely moved, so the bank
    // will already have it in its own figure too.
    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: bankAccountId,
      kind: "expense",
      amount: "300000",
      occurredAt: new Date(Date.now() - DAY),
      source: "bank_sync",
      reviewStatus: "pending",
    });

    await db
      .update(bankLinks)
      .set({ lastBankBalance: "4700000", lastSyncedAt: new Date() })
      .where(eq(bankLinks.id, bankLinkId));

    const row = await driftFor(bankLinkId);
    expect(row?.derivedBalance).toBe(4_700_000);
    expect(row?.drift).toBe(0);
  });

  it("ignores future-dated recurring rows", async () => {
    // materialiseDueInstances writes confirmed transactions up to 30 days ahead.
    // The bank cannot know about those, so counting them would show every user
    // with a recurring rule a permanent phantom mismatch.
    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: bankAccountId,
      kind: "expense",
      amount: "1200000",
      occurredAt: new Date(Date.now() + 10 * DAY),
    });

    await db
      .update(bankLinks)
      .set({ lastBankBalance: "5000000", lastSyncedAt: new Date() })
      .where(eq(bankLinks.id, bankLinkId));

    const row = await driftFor(bankLinkId);
    expect(row?.drift).toBe(0);

    // And the account card still counts it — the divergence is intentional.
    const card = await getAccountWithBalance(OWNER_ID, bankAccountId);
    expect(card?.balance).toBe(3_800_000);
  });

  it("matches both account-balance queries when nothing is future-dated", async () => {
    // Guards against the three balance formulas drifting apart.
    await db.insert(transactions).values({
      userId: OWNER_ID,
      accountId: bankAccountId,
      kind: "expense",
      amount: "250000",
      occurredAt: new Date(Date.now() - 2 * DAY),
    });

    const row = await driftFor(bankLinkId);
    const single = await getAccountWithBalance(OWNER_ID, bankAccountId);
    const listed = (await listAccountsWithBalance(OWNER_ID)).find((a) => a.id === bankAccountId);

    expect(row?.derivedBalance).toBe(single?.balance);
    expect(row?.derivedBalance).toBe(listed?.balance);
    expect(row?.derivedBalance).toBe(4_750_000);
  });

  describe("credit card sign convention", () => {
    it("treats a positive reported debt as a negative app balance", async () => {
      // Spent 2M on the card: the app files the card as an asset running
      // negative, while the bank reports 2,000,000 owed. Same state, opposite sign.
      await db.insert(transactions).values({
        userId: OWNER_ID,
        accountId: cardAccountId,
        kind: "expense",
        amount: "2000000",
        occurredAt: new Date(Date.now() - DAY),
      });

      await db
        .update(bankLinks)
        .set({ lastBankBalance: "2000000", lastSyncedAt: new Date() })
        .where(eq(bankLinks.id, cardLinkId));

      const row = await driftFor(cardLinkId);
      expect(row?.derivedBalance).toBe(-2_000_000);
      expect(row?.drift).toBe(0);
    });

    it("computes a card mismatch but does not present it as a conclusion", async () => {
      await db
        .update(bankLinks)
        .set({ lastBankBalance: "999000", lastSyncedAt: new Date() })
        .where(eq(bankLinks.id, cardLinkId));

      const row = await driftFor(cardLinkId);
      expect(row?.drift).not.toBe(0);
      // The sign convention is unverified against a real card, so the number is
      // available but the badge stays off.
      expect(row?.showBadge).toBe(false);
    });
  });

  describe("staleness", () => {
    it("flags a link that has gone quiet, and ignores one never synced", () => {
      const now = new Date();
      expect(isSyncStale(null, now)).toBe(false);
      expect(isSyncStale(new Date(now.getTime() - 3 * DAY), now)).toBe(false);
      expect(isSyncStale(new Date(now.getTime() - 8 * DAY), now)).toBe(true);
    });
  });
});
