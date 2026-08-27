import "server-only";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, bankLinks, bankSyncTokens } from "@/lib/db/schema";

export type WebhookTokenMeta = {
  createdAt: Date;
  lastUsedAt: Date | null;
  label: string | null;
};

export type BankLinkRow = {
  id: string;
  accountId: string;
  accountName: string;
  gateway: string;
  accountNumber: string;
  lastBankBalance: number | null;
  lastSyncedAt: Date | null;
};

export type BankSyncSettings = {
  token: WebhookTokenMeta | null;
  links: BankLinkRow[];
};

// Everything the settings screen needs. The raw token is deliberately absent —
// it exists only in the response of the action that created it, and is never
// readable again from anywhere.
export async function getBankSyncSettings(userId: string): Promise<BankSyncSettings> {
  const [tokenRow] = await db
    .select({
      createdAt: bankSyncTokens.createdAt,
      lastUsedAt: bankSyncTokens.lastUsedAt,
      label: bankSyncTokens.label,
    })
    .from(bankSyncTokens)
    .where(and(eq(bankSyncTokens.userId, userId), isNull(bankSyncTokens.revokedAt)))
    .limit(1);

  const links = await db
    .select({
      id: bankLinks.id,
      accountId: bankLinks.accountId,
      accountName: accounts.name,
      gateway: bankLinks.gateway,
      accountNumber: bankLinks.accountNumber,
      lastBankBalance: bankLinks.lastBankBalance,
      lastSyncedAt: bankLinks.lastSyncedAt,
    })
    .from(bankLinks)
    .innerJoin(accounts, eq(accounts.id, bankLinks.accountId))
    .where(eq(bankLinks.userId, userId))
    .orderBy(desc(bankLinks.createdAt));

  return {
    token: tokenRow ?? null,
    links: links.map((l) => ({
      ...l,
      lastBankBalance: l.lastBankBalance === null ? null : Number(l.lastBankBalance),
    })),
  };
}

// Account types a bank link may point at, and the reason the restriction exists:
// listAccountsWithBalance computes `debt`/`receivable` balances with a DIFFERENT
// formula (initial − settled) than asset accounts (initial + movements). Linking
// a debt account would make the balance-drift check compare two incompatible
// formulas, report a permanent mismatch, and then invite the user to "fix" it by
// editing initial_balance — corrupting data to chase a formula error.
export const LINKABLE_ACCOUNT_TYPES = ["bank", "credit_card"] as const;

export type LinkableAccount = { id: string; name: string; type: "bank" | "credit_card" };

// Selectable accounts for the link form: bank/credit-card only, never archived.
// The same predicate is enforced server-side in upsertBankLink — this query only
// keeps the ineligible options out of the picker.
export async function listLinkableAccounts(userId: string): Promise<LinkableAccount[]> {
  return db
    .select({ id: accounts.id, name: accounts.name, type: accounts.type })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(accounts.type, [...LINKABLE_ACCOUNT_TYPES]),
        ne(accounts.status, "archived"),
      ),
    )
    .orderBy(accounts.createdAt) as Promise<LinkableAccount[]>;
}
