import type { Db } from "./client";
import { categories } from "./schema/categories";
import { cronState } from "./schema/cron-state";

// 10 VN-aware root spending categories. `icon` = Lucide icon name, `color` = hex
// swatch from the design palette. Seeded once per owner; idempotent on (user, slug).
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

// Idempotent seed: inserts the category tree for `ownerId` and the single
// cron_state heartbeat row. Safe to re-run — conflicts are ignored.
export async function seed(db: Db, ownerId: string): Promise<{ categories: number }> {
  const rows = SEED_CATEGORIES.map((c) => ({ ...c, userId: ownerId }));
  const inserted = await db
    .insert(categories)
    .values(rows)
    .onConflictDoNothing({ target: [categories.userId, categories.slug] })
    .returning({ id: categories.id });

  await db.insert(cronState).values({ id: true }).onConflictDoNothing();

  return { categories: inserted.length };
}
