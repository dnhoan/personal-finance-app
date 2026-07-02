import { and, eq, ne } from "drizzle-orm";
import type { Db } from "./client";
import { accounts } from "./schema/accounts";
import { categories } from "./schema/categories";
import { cronState } from "./schema/cron-state";

// 10 VN-aware root spending categories. `icon` = Lucide icon name, `color` = hex
// swatch from the design palette. Seeded once per owner; idempotent on (user, slug).
// All seeded buckets are expense categories.
export const SEED_CATEGORIES: ReadonlyArray<{
  slug: string;
  name: string;
  icon: string;
  color: string;
}> = [
  { slug: "an-uong", name: "Ăn uống", icon: "utensils", color: "#ef4444" },
  { slug: "giao-thong", name: "Giao thông", icon: "bus", color: "#f97316" },
  { slug: "nha-o", name: "Nhà ở", icon: "home", color: "#eab308" },
  { slug: "y-te", name: "Y tế", icon: "heart-pulse", color: "#22c55e" },
  { slug: "giao-duc", name: "Giáo dục", icon: "graduation-cap", color: "#14b8a6" },
  { slug: "mua-sam", name: "Mua sắm", icon: "shopping-bag", color: "#06b6d4" },
  { slug: "giai-tri", name: "Giải trí", icon: "gamepad-2", color: "#6366f1" },
  { slug: "ca-phe-tra", name: "Cà phê & Trà", icon: "coffee", color: "#a855f7" },
  { slug: "quan-an-nhanh", name: "Quán ăn nhanh", icon: "sandwich", color: "#ec4899" },
  { slug: "dich-vu-cuoc-phi", name: "Dịch vụ & Cước phí", icon: "receipt", color: "#64748b" },
];

// Atomic, idempotent first-sign-in provisioning for `ownerId`: the VN category
// tree AND a default `Cash` account, in ONE transaction so a new user never ends
// up half-provisioned (categories but no account would soft-lock the add screen).
// Safe to re-run — categories upsert on (user, slug); the account is inserted only
// when the user has no ACTIVE account, so a user who archived the seeded account
// (which clears is_default) can be re-provisioned, and one who made their own
// accounts is left alone. The partial-unique accounts_user_default_uniq is the DB
// backstop against a concurrent double-insert creating two defaults.
export async function seed(
  db: Db,
  ownerId: string,
): Promise<{ categories: number; account: boolean }> {
  return db.transaction(async (tx) => {
    const rows = SEED_CATEGORIES.map((c) => ({ ...c, kind: "expense" as const, userId: ownerId }));
    const inserted = await tx
      .insert(categories)
      .values(rows)
      .onConflictDoNothing({ target: [categories.userId, categories.slug] })
      .returning({ id: categories.id });

    const [activeAccount] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, ownerId), ne(accounts.status, "archived")))
      .limit(1);

    let account = false;
    if (!activeAccount) {
      const insertedAccounts = await tx
        .insert(accounts)
        .values({ userId: ownerId, name: "Tiền mặt", type: "cash", isDefault: true })
        .onConflictDoNothing()
        .returning({ id: accounts.id });
      // A concurrent seed may have won the partial-unique default race, inserting 0
      // rows here — reflect what THIS call actually created.
      account = insertedAccounts.length > 0;
    }

    await tx.insert(cronState).values({ id: true }).onConflictDoNothing();

    return { categories: inserted.length, account };
  });
}
