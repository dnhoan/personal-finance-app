"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { getAccountWithBalance } from "./queries";
import {
  createAccountSchema,
  updateAccountSchema,
  archiveAccountSchema,
  unarchiveAccountSchema,
  setDefaultAccountSchema,
  type CreateAccountInput,
} from "./schemas";

function revalidateAccountViews() {
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  // Detail page shows the hero name + balance, so rename/archive must refresh it.
  revalidatePath("/accounts/[id]", "page");
}

export async function createAccount(input: CreateAccountInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createAccountSchema.parse(input);

  const [row] = await db
    .insert(accounts)
    .values({
      userId: user.id,
      name: data.name,
      type: data.type,
      initialBalance: String(data.initialBalance),
    })
    .returning({ id: accounts.id });

  revalidateAccountViews();
  return { id: row!.id };
}

// Updates the editable fields of an account: name and current balance. Type stays
// immutable. `currentBalance` is the desired displayed balance; since balance =
// opening + transactions (linear in opening for every type), we back-solve the
// stored opening balance: new_opening = opening + (target − current). The opening
// balance may land below zero when transactions already exceed the target — that's
// intentional and never surfaced (only the derived balance is shown).
export async function updateAccount(input: {
  id: string;
  name: string;
  currentBalance: number;
}): Promise<void> {
  const { user } = await requireSession();
  const data = updateAccountSchema.parse(input);

  // Owner-scoped read; null when the id isn't the user's — leave it a no-op.
  const account = await getAccountWithBalance(user.id, data.id);
  if (!account) return;

  const newInitial = account.initialBalance + (data.currentBalance - account.balance);

  await db
    .update(accounts)
    .set({
      name: data.name,
      initialBalance: String(newInitial),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));

  revalidateAccountViews();
}

// Soft delete: accounts are never hard-deleted (transactions reference them via
// ON DELETE RESTRICT). Archiving hides them from pickers; history stays intact.
export async function archiveAccount(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const data = archiveAccountSchema.parse(input);

  // Clearing isDefault keeps the invariant that the default account is always
  // active — an archived account must not stay the quick-add default.
  await db
    .update(accounts)
    .set({ status: "archived", isDefault: false, updatedAt: new Date() })
    .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));

  revalidateAccountViews();
}

// Reverses archiveAccount — restores the account to the active pickers. Backs the
// undo-toast offered right after archiving. Restores to "open" (the schema
// default); a prior debt sub-status (partial/settled) isn't preserved across an
// archive round-trip — acceptable for the undo window's scope.
export async function unarchiveAccount(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const data = unarchiveAccountSchema.parse(input);

  await db
    .update(accounts)
    .set({ status: "open", updatedAt: new Date() })
    .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));

  revalidateAccountViews();
}

// Marks one account as the user's default (the quick-add pre-selection). Clears
// the prior default in the same transaction so the partial unique index never
// trips in the normal flow; the index is the backstop. Archived accounts are
// rejected (no-op) — the default must stay active.
export async function setDefaultAccount(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const data = setDefaultAccountSchema.parse(input);

  await db.transaction(async (tx) => {
    // Validate the target is the user's and active BEFORE clearing the prior
    // default — otherwise a bad/archived id would clear the existing default and
    // set nothing, leaving the user with no default at all.
    const [target] = await tx
      .select({ id: accounts.id, status: accounts.status })
      .from(accounts)
      .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));
    if (!target || target.status === "archived") return;

    await tx
      .update(accounts)
      .set({ isDefault: false })
      .where(and(eq(accounts.userId, user.id), eq(accounts.isDefault, true)));
    await tx
      .update(accounts)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));
  });

  revalidateAccountViews();
  // Quick-add defaults are read on these surfaces.
  revalidatePath("/transactions");
}
