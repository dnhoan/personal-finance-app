import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, categories } from "@/lib/db/schema";

// Ownership guards for transaction writes. The transaction FKs reference
// accounts/categories by id ALONE, so without these checks an authenticated user
// could attach a transaction to another user's account or category (cross-tenant
// IDOR) — and because account_id is ON DELETE RESTRICT, that foreign row would
// also block the victim from ever archiving/deleting the account. Every create,
// update, and transfer action MUST assert ownership of the ids it accepts from
// the client. Error copy mirrors the recurring-rule ownership guard.

export async function assertAccountOwned(userId: string, accountId: string): Promise<void> {
  const [acc] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!acc) throw new Error("Tài khoản không tồn tại");
}

// Account must belong to the user; category (when set) must belong to the user
// and match the transaction's income/expense kind.
export async function assertTxRefsOwned(
  userId: string,
  accountId: string,
  categoryId: string | null,
  kind: "income" | "expense",
): Promise<void> {
  await assertAccountOwned(userId, accountId);

  if (categoryId) {
    const [cat] = await db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!cat) throw new Error("Danh mục không tồn tại");
    if (cat.kind !== kind) throw new Error("Danh mục không khớp loại thu/chi");
  }
}

// Both legs of a transfer must belong to the user.
export async function assertTransferAccountsOwned(
  userId: string,
  fromAccountId: string,
  toAccountId: string,
): Promise<void> {
  await assertAccountOwned(userId, fromAccountId);
  await assertAccountOwned(userId, toAccountId);
}
