import {
  pgTable,
  uuid,
  text,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "../auth-schema";
import { accounts } from "./accounts";
import { transactions } from "./transactions";
import { timestamps } from "./timestamps";

// Per-user webhook credential. The user pastes the raw token into SePay's
// `Api_Key` field; only its SHA-256 digest is stored here, so a database leak
// cannot be replayed against the webhook. Lookup goes digest → user, which is why
// the hash is globally unique rather than unique per user.
export const bankSyncTokens = pgTable(
  "bank_sync_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bank_sync_tokens_hash_uniq").on(t.tokenHash),
    // At most one live token per user. Revoked rows drop out of the index, so
    // rotation is "revoke then insert" without a unique violation.
    uniqueIndex("bank_sync_tokens_user_active_uniq")
      .on(t.userId)
      .where(sql`revoked_at is null`),
  ],
);

// Maps a bank account as SePay names it — (gateway, accountNumber) — onto an
// internal account. `gateway` stays free text because SePay's bank list changes
// over time; an enum would force a migration every time they add one. Compare
// case-insensitively on lookup.
export const bankLinks = pgTable(
  "bank_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // RESTRICT matches the transactions FK: an account with sync history must be
    // unlinked deliberately, not deleted out from under its ledger rows.
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    gateway: text("gateway").notNull(),
    accountNumber: text("account_number").notNull(),
    // `accumulated` from the most recent event — the bank's own balance, kept for
    // drift comparison only. It never overwrites accounts.initial_balance.
    lastBankBalance: numeric("last_bank_balance", { precision: 18, scale: 0 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bank_links_user_gateway_number_uniq").on(t.userId, t.gateway, t.accountNumber),
    index("bank_links_user_idx").on(t.userId),
  ],
);

// Raw webhook journal. This is NOT a staging table for review — every event that
// matches a link writes its transaction row immediately. It exists for three jobs
// the columns on `transactions` cannot do:
//   1. Durable dedupe. SePay retries 7 times over ~5h; if the user deleted the
//      transaction in between, a dedupe key living on `transactions` would be gone
//      and the retry would resurrect a ghost row.
//   2. Unmatched events. An event from an unmapped account number has no
//      account_id to write, and that column is NOT NULL.
//   3. Audit. The original payload settles balance disputes without a trip to the
//      SePay dashboard.
//
// `payload` holds transfer descriptions — personal data. Never log it and never
// put it in the CSV export; the renewal cron prunes rows past 90 days.
export const bankSyncEvents = pgTable(
  "bank_sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // SePay's own event id — the dedupe key, scoped per user.
    sepayId: text("sepay_id").notNull(),
    bankLinkId: uuid("bank_link_id").references(() => bankLinks.id, { onDelete: "set null" }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    // One of: `received` (audit written, processing not finished), `imported`
    // (transaction created, transaction_id points at it), `unmatched` (no
    // bank_link for this (gateway, accountNumber) — waiting on reprocessing), or
    // `skipped_zero_amount` (transferAmount was 0, deliberately no transaction).
    // `skipped_zero_amount` is deliberately not folded into `imported`: deleting a
    // transaction nulls transaction_id, so `imported` + NULL already means "the
    // user deleted it" and cannot carry a second meaning.
    status: text("status").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bank_sync_events_user_sepay_id_uniq").on(t.userId, t.sepayId),
    index("bank_sync_events_user_status_idx").on(t.userId, t.status),
    // The inbox joins back to the event to show which bank sent a row; without
    // this, rendering /inbox and its nav badge scans the whole event history.
    index("bank_sync_events_transaction_idx").on(t.transactionId),
  ],
);
