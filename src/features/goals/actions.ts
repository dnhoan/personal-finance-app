"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { goals, accounts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import {
  createGoalSchema,
  updateGoalSchema,
  archiveGoalSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "./schemas";

function revalidateGoalViews() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

// Verifies an optional account link belongs to the user. Empty/undefined → null.
async function resolveAccountId(
  userId: string,
  accountId: string | null | undefined,
): Promise<string | null> {
  if (!accountId) return null;
  const [acc] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!acc) throw new Error("Tài khoản không tồn tại");
  return acc.id;
}

export async function createGoal(input: CreateGoalInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createGoalSchema.parse(input);
  const accountId = await resolveAccountId(user.id, data.accountId);

  const [row] = await db
    .insert(goals)
    .values({
      userId: user.id,
      name: data.name,
      targetAmount: String(data.targetAmount),
      targetDate: data.targetDate || null,
      accountId,
    })
    .returning({ id: goals.id });

  revalidateGoalViews();
  return { id: row!.id };
}

export async function updateGoal(input: UpdateGoalInput): Promise<void> {
  const { user } = await requireSession();
  const data = updateGoalSchema.parse(input);
  const accountId = await resolveAccountId(user.id, data.accountId);

  await db
    .update(goals)
    .set({
      name: data.name,
      targetAmount: String(data.targetAmount),
      targetDate: data.targetDate || null,
      accountId,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, data.id), eq(goals.userId, user.id)));

  revalidateGoalViews();
}

// Soft hide/restore. Tagged transactions keep their goal_id (history intact);
// progress still computes, the goal just drops out of the default list.
export async function archiveGoal(input: { id: string; archived: boolean }): Promise<void> {
  const { user } = await requireSession();
  const data = archiveGoalSchema.parse(input);

  await db
    .update(goals)
    .set({ archivedAt: data.archived ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(goals.id, data.id), eq(goals.userId, user.id)));

  revalidateGoalViews();
}
