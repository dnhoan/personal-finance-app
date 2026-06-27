"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import {
  createAccountSchema,
  renameAccountSchema,
  archiveAccountSchema,
  unarchiveAccountSchema,
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

export async function renameAccount(input: { id: string; name: string }): Promise<void> {
  const { user } = await requireSession();
  const data = renameAccountSchema.parse(input);

  await db
    .update(accounts)
    .set({ name: data.name, updatedAt: new Date() })
    .where(and(eq(accounts.id, data.id), eq(accounts.userId, user.id)));

  revalidateAccountViews();
}

// Soft delete: accounts are never hard-deleted (transactions reference them via
// ON DELETE RESTRICT). Archiving hides them from pickers; history stays intact.
export async function archiveAccount(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const data = archiveAccountSchema.parse(input);

  await db
    .update(accounts)
    .set({ status: "archived", updatedAt: new Date() })
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
