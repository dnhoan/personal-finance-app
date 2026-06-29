import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { accounts, transactions } from "@/lib/db/schema";
import { netWorthSnapshot } from "@/features/reports/queries";
import { netWorthTrend } from "@/features/reports/net-worth-trend-query";

// The correctness gate for the derived-on-read trend: its latest (current) month
// must reproduce netWorthSnapshot exactly, since both apply the same balance
// convention. Seeds in the current + previous ICT month (derived from now) so the
// equality holds regardless of the machine clock — no future-dated rows that the
// snapshot would count but the windowed trend would exclude. Live Neon.
const OWNER_ID = `test-nwtrend-${Date.now()}`;
const OWNER_EMAIL = `nwtrend-${Date.now()}@example.test`;

const now = new Date();
const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 5, 0, 0));
const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10, 5, 0, 0));

describe("netWorthTrend", () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: OWNER_ID, name: "NWTrend", email: OWNER_EMAIL, emailVerified: true });
    const [cash] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Tiền mặt", type: "cash", initialBalance: "5000000" })
      .returning({ id: accounts.id });
    const [debt] = await db
      .insert(accounts)
      .values({ userId: OWNER_ID, name: "Vay", type: "debt", initialBalance: "4000000" })
      .returning({ id: accounts.id });
    await db.insert(transactions).values([
      {
        userId: OWNER_ID,
        accountId: cash!.id,
        kind: "expense",
        amount: "1000000",
        occurredAt: prevMonth,
      },
      {
        userId: OWNER_ID,
        accountId: cash!.id,
        kind: "income",
        amount: "2000000",
        occurredAt: thisMonth,
      },
      {
        userId: OWNER_ID,
        accountId: debt!.id,
        kind: "expense",
        amount: "1000000",
        occurredAt: thisMonth,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, OWNER_ID));
  });

  it("latest month reproduces netWorthSnapshot (same convention)", async () => {
    const [trend, snap] = await Promise.all([
      netWorthTrend(OWNER_ID, 12),
      netWorthSnapshot(OWNER_ID),
    ]);
    expect(trend.length).toBe(12);
    const latest = trend[trend.length - 1]!;
    expect(latest.net).toBe(snap.net);
    expect(latest.assets).toBe(snap.assets);
    expect(latest.liabilities).toBe(snap.liabilities);
  });

  it("returns months in ascending order", async () => {
    const trend = await netWorthTrend(OWNER_ID, 12);
    const keys = trend.map((p) => p.monthKey);
    expect(keys).toEqual([...keys].sort());
  });

  it("previous month excludes the current month's activity", async () => {
    const trend = await netWorthTrend(OWNER_ID, 12);
    const prev = trend[trend.length - 2]!;
    // Only the prev-month 1M cash expense applies: cash 4M, bank 0, debt owed 4M
    // → assets 4M, net 0. The current-month income/debt-paydown is not yet counted.
    expect(prev.assets).toBe(4_000_000);
    expect(prev.net).toBe(0);
  });
});
