import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, isNull } from "drizzle-orm";

// Stub the auth gate so the server actions run against the live DB as a fixed
// user, and neutralise next/cache (no request context under vitest).
const OWNER_ID = `test-banksync-${Date.now()}`;
vi.mock("@/lib/auth-session", () => ({
  requireSession: async () => ({ user: { id: OWNER_ID } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, bankLinks, bankSyncTokens } from "@/lib/db/schema";
import {
  createWebhookToken,
  deleteBankLink,
  revokeWebhookToken,
  upsertBankLink,
} from "@/features/bank-sync/actions";
import { getBankSyncSettings, listLinkableAccounts } from "@/features/bank-sync/queries";
import { hashToken } from "@/features/bank-sync/lib/token";

const stamp = Date.now();
const OTHER_ID = `test-banksync-other-${stamp}`;

let bankId: string;
let cardId: string;
let cashId: string;
let debtId: string;
let archivedId: string;
let otherBankId: string;

describe("bank sync token + link actions", () => {
  beforeAll(async () => {
    await db.insert(user).values([
      { id: OWNER_ID, name: "Owner", email: `banksync-${stamp}@example.test`, emailVerified: true },
      {
        id: OTHER_ID,
        name: "Other",
        email: `banksync-other-${stamp}@example.test`,
        emailVerified: true,
      },
    ]);

    const mk = async (
      userId: string,
      name: string,
      type: "bank" | "credit_card" | "cash" | "debt",
      status: "open" | "archived" = "open",
    ) => {
      const [row] = await db
        .insert(accounts)
        .values({ userId, name, type, status })
        .returning({ id: accounts.id });
      return row!.id;
    };

    bankId = await mk(OWNER_ID, "Ngân hàng chính", "bank");
    cardId = await mk(OWNER_ID, "Thẻ tín dụng", "credit_card");
    cashId = await mk(OWNER_ID, "Tiền mặt", "cash");
    debtId = await mk(OWNER_ID, "Khoản vay", "debt");
    archivedId = await mk(OWNER_ID, "Ngân hàng cũ", "bank", "archived");
    otherBankId = await mk(OTHER_ID, "NH người khác", "bank");
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
    await db.delete(user).where(eq(user.id, OTHER_ID));
  });

  describe("token lifecycle", () => {
    it("stores only the digest and rotates by revoking the previous token", async () => {
      const { token: first } = await createWebhookToken();
      expect(first.startsWith("pfa_")).toBe(true);

      const stored = await db
        .select({ hash: bankSyncTokens.tokenHash })
        .from(bankSyncTokens)
        .where(and(eq(bankSyncTokens.userId, OWNER_ID), isNull(bankSyncTokens.revokedAt)));
      expect(stored).toHaveLength(1);
      // The raw token must be unrecoverable from the row.
      expect(stored[0]?.hash).toBe(hashToken(first));
      expect(stored[0]?.hash).not.toBe(first);

      // Rotating must not trip the one-active-token partial unique index.
      const { token: second } = await createWebhookToken();
      expect(second).not.toBe(first);

      const active = await db
        .select({ hash: bankSyncTokens.tokenHash })
        .from(bankSyncTokens)
        .where(and(eq(bankSyncTokens.userId, OWNER_ID), isNull(bankSyncTokens.revokedAt)));
      expect(active).toHaveLength(1);
      expect(active[0]?.hash).toBe(hashToken(second));
    });

    it("never exposes the raw token through the settings query", async () => {
      const settings = await getBankSyncSettings(OWNER_ID);
      expect(settings.token).not.toBeNull();
      expect(JSON.stringify(settings.token)).not.toContain("pfa_");
    });

    it("leaves no active token after revoke", async () => {
      await revokeWebhookToken();
      const settings = await getBankSyncSettings(OWNER_ID);
      expect(settings.token).toBeNull();
    });
  });

  describe("link ownership and account-type guards", () => {
    it("rejects another user's account (cross-tenant)", async () => {
      await expect(
        upsertBankLink({
          accountId: otherBankId,
          gateway: "Vietcombank",
          accountNumber: "0123456789",
        }),
      ).rejects.toThrow();

      const leaked = await db.select().from(bankLinks).where(eq(bankLinks.userId, OWNER_ID));
      expect(leaked).toHaveLength(0);
    });

    it.each([
      ["cash", () => cashId],
      ["debt", () => debtId],
      ["archived bank", () => archivedId],
    ])("rejects a %s account", async (_label, getId) => {
      await expect(
        upsertBankLink({ accountId: getId(), gateway: "MB", accountNumber: "9999888877" }),
      ).rejects.toThrow();
    });

    it("offers only open bank and credit-card accounts in the picker", async () => {
      const options = (await listLinkableAccounts(OWNER_ID)).map((a) => a.id).sort();
      expect(options).toEqual([bankId, cardId].sort());
    });
  });

  describe("link upsert", () => {
    it("normalises the account number and collapses a repeat into one row", async () => {
      await upsertBankLink({
        accountId: bankId,
        gateway: " Vietcombank ",
        accountNumber: "0123 456-789",
      });

      let rows = await db.select().from(bankLinks).where(eq(bankLinks.userId, OWNER_ID));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.gateway).toBe("Vietcombank");
      expect(rows[0]?.accountNumber).toBe("0123456789");

      // Same pair typed differently → re-points the existing row, no duplicate.
      await upsertBankLink({
        accountId: cardId,
        gateway: "Vietcombank",
        accountNumber: "0123456789",
      });

      rows = await db.select().from(bankLinks).where(eq(bankLinks.userId, OWNER_ID));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.accountId).toBe(cardId);
    });

    it("rejects a non-numeric account number", async () => {
      await expect(
        upsertBankLink({ accountId: bankId, gateway: "ACB", accountNumber: "abc123" }),
      ).rejects.toThrow();
    });

    it("links several bank accounts to different internal accounts", async () => {
      await upsertBankLink({ accountId: bankId, gateway: "MB", accountNumber: "5555666677" });

      const settings = await getBankSyncSettings(OWNER_ID);
      expect(settings.links).toHaveLength(2);
      expect(new Set(settings.links.map((l) => l.accountId))).toEqual(new Set([bankId, cardId]));
    });

    it("deletes only the mapping, and only the owner's", async () => {
      const [mine] = await db
        .select({ id: bankLinks.id })
        .from(bankLinks)
        .where(and(eq(bankLinks.userId, OWNER_ID), eq(bankLinks.gateway, "MB")));

      const [theirs] = await db
        .insert(bankLinks)
        .values({
          userId: OTHER_ID,
          accountId: otherBankId,
          gateway: "TPBank",
          accountNumber: "4444333322",
        })
        .returning({ id: bankLinks.id });

      // Another user's link id must be a no-op, not a delete.
      await deleteBankLink({ id: theirs!.id });
      expect(await db.select().from(bankLinks).where(eq(bankLinks.id, theirs!.id))).toHaveLength(1);

      await deleteBankLink({ id: mine!.id });
      expect(await db.select().from(bankLinks).where(eq(bankLinks.id, mine!.id))).toHaveLength(0);
    });
  });
});
