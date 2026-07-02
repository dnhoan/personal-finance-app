import { revalidatePath } from "next/cache";

// Surfaces that reflect transaction changes: dashboard recent list + hero,
// the transactions list, and account balances.
export function revalidateTxViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  // Per-transaction detail page reflects an edit (and must clear on delete).
  revalidatePath("/transactions/[id]", "page");
  revalidatePath("/accounts");
  // Detail page shows the account's balance, month stats, and tx history, so a
  // tx mutation on any account must refresh it.
  revalidatePath("/accounts/[id]", "page");
  // Categories manager shows each category's monthly spend/income total.
  revalidatePath("/settings/categories");
  // Goal progress and debt remaining/status are computed from the ledger, so any
  // tx mutation (tag a goal, pay down a debt) must refresh those surfaces too.
  revalidatePath("/goals");
  revalidatePath("/debts");
}
