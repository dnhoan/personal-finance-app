import { revalidatePath } from "next/cache";

// Surfaces that reflect transaction changes: dashboard recent list + hero,
// the transactions list, and account balances.
export function revalidateTxViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
