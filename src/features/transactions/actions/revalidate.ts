import { revalidatePath } from "next/cache";

// Surfaces that reflect transaction changes: dashboard recent list + hero,
// the transactions list, and account balances.
export function revalidateTxViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  // Detail page shows the account's balance, month stats, and tx history, so a
  // tx mutation on any account must refresh it.
  revalidatePath("/accounts/[id]", "page");
  // Categories manager shows each category's monthly spend/income total.
  revalidatePath("/settings/categories");
}
