"use server";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { logger, formatError } from "@/lib/logger";
import { accounts, bankLinks, bankSyncTokens } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { reprocessUnmatchedEvents } from "@/server/webhooks/sepay/reprocess-unmatched-events";
import { generateWebhookToken, hashToken } from "./lib/token";
import { LINKABLE_ACCOUNT_TYPES } from "./queries";
import { deleteBankLinkSchema, upsertBankLinkSchema, type UpsertBankLinkInput } from "./schemas";

function revalidateBankSyncViews() {
  revalidatePath("/settings/bank-sync");
}

/**
 * Issues a fresh webhook token, replacing any existing one.
 *
 * The raw token is returned HERE AND NOWHERE ELSE — only its SHA-256 digest is
 * stored, so this return value is the single opportunity the user has to copy
 * it. Revoke-then-insert runs in one transaction because the partial unique
 * index permits only one unrevoked token per user; doing it in two steps would
 * leave a window where a crash strands the user with no token and no way to make
 * one.
 */
export async function createWebhookToken(): Promise<{ token: string }> {
  const { user } = await requireSession();
  const raw = generateWebhookToken();

  await db.transaction(async (tx) => {
    await tx
      .update(bankSyncTokens)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(bankSyncTokens.userId, user.id), isNull(bankSyncTokens.revokedAt)));

    await tx.insert(bankSyncTokens).values({
      userId: user.id,
      tokenHash: hashToken(raw),
      label: "SePay webhook",
    });
  });

  revalidateBankSyncViews();
  return { token: raw };
}

// Revokes the active token. Deliveries authenticating with it start failing
// immediately, which is the point — this is the response to a leak.
export async function revokeWebhookToken(): Promise<void> {
  const { user } = await requireSession();

  await db
    .update(bankSyncTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(bankSyncTokens.userId, user.id), isNull(bankSyncTokens.revokedAt)));

  revalidateBankSyncViews();
}

/**
 * Creates or updates the (gateway, account number) → account mapping.
 *
 * `accountId` arrives from the client, so ownership is re-checked here rather
 * than trusted: the accounts FK keys on id alone, and without this an
 * authenticated user could route their own bank feed into someone else's
 * account. The type/archived check is enforced server-side too — a hand-built
 * request must not reach a debt account just because the picker hid it.
 */
export async function upsertBankLink(input: UpsertBankLinkInput): Promise<void> {
  const { user } = await requireSession();
  const data = upsertBankLinkSchema.parse(input);

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, data.accountId),
        eq(accounts.userId, user.id),
        inArray(accounts.type, [...LINKABLE_ACCOUNT_TYPES]),
        ne(accounts.status, "archived"),
      ),
    );
  if (!account) {
    throw new Error("Chỉ liên kết được với tài khoản ngân hàng hoặc thẻ tín dụng đang mở");
  }

  await db
    .insert(bankLinks)
    .values({
      userId: user.id,
      accountId: data.accountId,
      gateway: data.gateway,
      accountNumber: data.accountNumber,
    })
    // Re-pointing an existing (gateway, number) at a different internal account
    // is an edit, not a duplicate — the unique index turns it into one row.
    .onConflictDoUpdate({
      target: [bankLinks.userId, bankLinks.gateway, bankLinks.accountNumber],
      set: { accountId: data.accountId, updatedAt: new Date() },
    });

  // Deliveries that arrived before this mapping existed are waiting in the
  // journal — most often because the number was first typed with a wrong digit.
  // Replaying here is what makes them recoverable at all: SePay treats the 200
  // they already received as final and will never send them again. Best-effort,
  // because failing the link edit would leave the user unable to fix the very
  // mistake that stranded them.
  try {
    await reprocessUnmatchedEvents(db, user.id);
  } catch (err) {
    logger.error("bank-sync", "replay after link upsert failed", { error: formatError(err) });
  }

  revalidateBankSyncViews();
}

// Removes the mapping only. Transactions already synced through it stay in the
// ledger — they are real money that moved, and deleting the label they arrived
// under is not a reason to erase them.
export async function deleteBankLink(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const { id } = deleteBankLinkSchema.parse(input);

  await db.delete(bankLinks).where(and(eq(bankLinks.id, id), eq(bankLinks.userId, user.id)));

  revalidateBankSyncViews();
}
