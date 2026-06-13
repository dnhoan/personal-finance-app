import { pgTable, boolean, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./timestamps";

// Single-row heartbeat table. The boolean PK + CHECK(id) pins it to exactly one
// row (id = true). Phase 9 cron writes `lastRenewalCheckAt`; the dashboard reads
// it to surface "last alert run" so a silent cron failure is visible.
export const cronState = pgTable(
  "cron_state",
  {
    id: boolean("id").primaryKey().default(true),
    lastRenewalCheckAt: timestamp("last_renewal_check_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [check("cron_state_singleton", sql`${t.id}`)],
);
