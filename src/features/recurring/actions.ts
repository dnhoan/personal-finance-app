"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { recurringRules, transactions, accounts, categories } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-session";
import { firstDueDate, vnDateToAnchor, anchorToVnDate } from "./lib/rrule-builder";
import {
  createRuleSchema,
  updateRuleSchema,
  deleteRuleSchema,
  pauseRuleSchema,
  detachInstanceSchema,
  type CreateRuleInput,
  type UpdateRuleInput,
} from "./schemas";

function revalidateRecurringViews() {
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// Account must belong to the user; category (when set) must belong to the user
// and match the rule's income/expense kind.
async function assertOwnership(
  userId: string,
  accountId: string,
  categoryId: string | null,
  kind: "income" | "expense",
): Promise<void> {
  const [acc] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!acc) throw new Error("Tài khoản không tồn tại");

  if (categoryId) {
    const [cat] = await db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!cat) throw new Error("Danh mục không tồn tại");
    if (cat.kind !== kind) throw new Error("Danh mục không khớp loại thu/chi");
  }
}

export async function createRule(input: CreateRuleInput): Promise<{ id: string }> {
  const { user } = await requireSession();
  const data = createRuleSchema.parse(input);
  await assertOwnership(user.id, data.accountId, data.categoryId ?? null, data.kind);

  // First occurrence on/after today drives the materialisation cursor. (Past
  // occurrences back to DTSTART are still generated on first materialise.)
  const due = firstDueDate(data.rrule, new Date(), true);
  if (!due) throw new Error("Quy tắc không có lần lặp nào trong tương lai");

  const [row] = await db
    .insert(recurringRules)
    .values({
      userId: user.id,
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      kind: data.kind,
      amount: String(data.amount),
      note: data.note?.trim() || null,
      rrule: data.rrule,
      nextDue: anchorToVnDate(due),
      leadDays: data.leadDays,
    })
    .returning({ id: recurringRules.id });

  revalidateRecurringViews();
  return { id: row!.id };
}

// Edit series: mutate the rule going forward. Past materialised rows are left
// untouched (they are historical record) — only occurrences after the cursor pick
// up the new fields. Holds the per-rule advisory lock so it serialises against a
// concurrent materialise.
export async function updateRule(input: UpdateRuleInput): Promise<void> {
  const { user } = await requireSession();
  const data = updateRuleSchema.parse(input);
  await assertOwnership(user.id, data.accountId, data.categoryId ?? null, data.kind);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`rule:${data.id}`}))`);
    const [rule] = await tx
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.id, data.id), eq(recurringRules.userId, user.id)));
    if (!rule) throw new Error("Quy tắc không tồn tại");

    // Next un-materialised occurrence under the new rule string.
    const cursor = rule.lastMaterialisedAt ? vnDateToAnchor(rule.lastMaterialisedAt) : new Date();
    const next = firstDueDate(data.rrule, cursor, rule.lastMaterialisedAt == null);

    await tx
      .update(recurringRules)
      .set({
        accountId: data.accountId,
        categoryId: data.categoryId ?? null,
        kind: data.kind,
        amount: String(data.amount),
        note: data.note?.trim() || null,
        rrule: data.rrule,
        leadDays: data.leadDays,
        nextDue: next ? anchorToVnDate(next) : (rule.lastMaterialisedAt ?? rule.nextDue),
        updatedAt: new Date(),
      })
      .where(eq(recurringRules.id, rule.id));
  });

  revalidateRecurringViews();
}

export async function deleteRule(input: { id: string }): Promise<void> {
  const { user } = await requireSession();
  const { id } = deleteRuleSchema.parse(input);
  // FK is ON DELETE SET NULL: materialised history is detached, never deleted.
  await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)));
  revalidateRecurringViews();
}

// Pause/resume. Pausing only stops future materialisation; already-materialised
// rows stay as historical/expected entries (user removes them manually if wanted).
export async function pauseRule(input: { id: string; active: boolean }): Promise<void> {
  const { user } = await requireSession();
  const { id, active } = pauseRuleSchema.parse(input);
  await db
    .update(recurringRules)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)));
  revalidateRecurringViews();
}

// Edit this instance only: detach the materialised transaction from its rule so
// future series edits/materialisation never touch it. The row then behaves as a
// normal transaction the user can freely edit.
export async function detachInstance(input: { transactionId: string }): Promise<void> {
  const { user } = await requireSession();
  const { transactionId } = detachInstanceSchema.parse(input);
  await db
    .update(transactions)
    .set({ recurringRuleId: null, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));
  revalidateRecurringViews();
}
