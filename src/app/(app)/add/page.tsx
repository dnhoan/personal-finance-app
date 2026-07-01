import { requireSession } from "@/lib/auth-session";
import { listActiveAccounts, getDefaultAccountId } from "@/features/accounts/queries";
import { listCategoriesFlat, getDefaultCategoryIds } from "@/features/categories/queries";
import { listActiveGoals } from "@/features/goals/queries";
import { resolveDefaultAccountId } from "@/features/transactions/lib/resolve-default-account";
import { AddTransactionScreen } from "@/features/transactions/components/add/add-transaction-screen";

export const metadata = { title: "Thêm giao dịch · Personal Finance" };

// Dedicated full-screen capture route. Mirrors the dashboard's data batch so the
// screen opens fully pre-filled (default account + per-kind default category). The
// (app) layout hides the bottom nav + desktop FAB on this path; the screen carries
// its own close affordance.
export default async function AddTransactionPage() {
  const { user } = await requireSession();

  const [accounts, categories, goals, explicitDefaultAccountId, defaultCategoryByKind] =
    await Promise.all([
      listActiveAccounts(user.id),
      listCategoriesFlat(user.id),
      listActiveGoals(user.id),
      getDefaultAccountId(user.id),
      getDefaultCategoryIds(user.id),
    ]);

  const defaultAccountId = resolveDefaultAccountId(explicitDefaultAccountId, accounts) ?? undefined;

  return (
    <AddTransactionScreen
      accounts={accounts}
      categories={categories}
      goals={goals}
      defaultAccountId={defaultAccountId}
      defaultCategoryByKind={defaultCategoryByKind}
    />
  );
}
