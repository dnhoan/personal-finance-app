// Shape and pure helpers for bank-balance reconciliation. Deliberately free of
// "server-only" and of any DB import: the badge that renders this is reachable
// from a client component, and pulling the query module in with it would drag
// the database client into the browser bundle.

export type BalanceDrift = {
  bankLinkId: string;
  accountId: string;
  accountName: string;
  accountType: "bank" | "credit_card";
  gateway: string;
  accountNumber: string;
  /** Bank's own figure, as reported. Null until a delivery carries one. */
  lastBankBalance: number | null;
  lastSyncedAt: Date | null;
  /** App balance as of NOW — excludes future-dated recurring rows. */
  derivedBalance: number;
  /** derived − bank, in the app's frame of reference. Null with no bank figure. */
  drift: number | null;
  /** False when the mismatch must not be presented to the user as a conclusion. */
  showBadge: boolean;
};

// Beyond this, the link is treated as stale — the bank has gone quiet, which is
// itself worth surfacing (same spirit as the cron heartbeat badge).
export const STALE_SYNC_DAYS = 7;

export function isSyncStale(lastSyncedAt: Date | null, now: Date = new Date()): boolean {
  if (!lastSyncedAt) return false;
  return now.getTime() - lastSyncedAt.getTime() > STALE_SYNC_DAYS * 86_400_000;
}
