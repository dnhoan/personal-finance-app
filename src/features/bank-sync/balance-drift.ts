import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ACCOUNT_BALANCE_EXPR } from "@/features/accounts/queries";
import type { BalanceDrift } from "./balance-drift-types";

export type { BalanceDrift } from "./balance-drift-types";
export { isSyncStale, STALE_SYNC_DAYS } from "./balance-drift-types";

/**
 * The bank reports a credit card's OUTSTANDING DEBT as a positive number, while
 * the app files a card under assets and lets its balance run negative as it is
 * spent. The two must be brought into one frame of reference before subtracting.
 *
 * Kept in exactly one place: if a real card link ever proves the convention is
 * the other way round, this is the single line to change.
 */
const BANK_BALANCE_SIGN: Record<"bank" | "credit_card", 1 | -1> = { bank: 1, credit_card: -1 };

/**
 * Whether a mismatch is shown as a conclusion, per account type.
 *
 * Off for credit cards on purpose. We have not confirmed that SePay reports
 * cards at all, nor whether `accumulated` would then mean the balance owed or
 * the credit still available. The raw figure is still stored and displayed —
 * that is just data — but "you are off by X" is a claim, and making it from an
 * unverified sign convention would be worse than saying nothing.
 */
const DRIFT_BADGE_ENABLED: Record<"bank" | "credit_card", boolean> = {
  bank: true,
  credit_card: false,
};

/**
 * Compares each linked account's computed balance against the bank's own.
 *
 * The `occurred_at <= now()` cut is essential rather than tidy.
 * `materialiseDueInstances` writes recurring transactions up to 30 days into the
 * future as `confirmed`, and the account card's balance includes them. A bank
 * only knows what has already happened, so without this filter every user with a
 * recurring rule on a linked account would see a permanent phantom mismatch —
 * and be invited to "fix" it by editing their opening balance, corrupting the
 * whole historical net-worth series.
 *
 * The consequence is deliberate: `derivedBalance` here does NOT equal the
 * balance shown on the account card whenever future-dated rows exist. The UI
 * labels it "as of today" so the two figures do not read as a bug.
 */
export async function getBalanceDrift(userId: string): Promise<BalanceDrift[]> {
  const rows = await db.execute<{
    bank_link_id: string;
    account_id: string;
    account_name: string;
    account_type: "bank" | "credit_card";
    gateway: string;
    account_number: string;
    last_bank_balance: string | null;
    last_synced_at: Date | null;
    derived_balance: string;
  }>(sql`
    SELECT bl.id AS bank_link_id,
           bl.account_id,
           a.name AS account_name,
           a.type AS account_type,
           bl.gateway,
           bl.account_number,
           bl.last_bank_balance::text AS last_bank_balance,
           bl.last_synced_at,
           ${ACCOUNT_BALANCE_EXPR}::text AS derived_balance
    FROM bank_links bl
    JOIN accounts a ON a.id = bl.account_id
    LEFT JOIN transactions t
      ON t.account_id = a.id
     AND t.user_id = a.user_id
     AND t.occurred_at <= now()
    WHERE bl.user_id = ${userId}
    GROUP BY bl.id, a.id
    ORDER BY bl.created_at ASC
  `);

  return rows.rows.map((r) => {
    const derivedBalance = Number(r.derived_balance);
    const lastBankBalance = r.last_bank_balance === null ? null : Number(r.last_bank_balance);

    // No delivery has carried a balance yet, so there is nothing to compare and
    // nothing worth warning about.
    const drift =
      lastBankBalance === null
        ? null
        : derivedBalance - BANK_BALANCE_SIGN[r.account_type] * lastBankBalance;

    return {
      bankLinkId: r.bank_link_id,
      accountId: r.account_id,
      accountName: r.account_name,
      accountType: r.account_type,
      gateway: r.gateway,
      accountNumber: r.account_number,
      lastBankBalance,
      lastSyncedAt: r.last_synced_at,
      derivedBalance,
      drift,
      showBadge: drift !== null && DRIFT_BADGE_ENABLED[r.account_type],
    };
  });
}
