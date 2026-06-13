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
  type CreateAccountInput,
} from "./schemas";

function revalidateAccountViews() {
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
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
