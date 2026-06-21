import { requireSession } from "@/lib/auth-session";
import { listGoalsWithProgress } from "@/features/goals/queries";
import { listActiveAccounts } from "@/features/accounts/queries";
import { GoalList } from "@/features/goals/components/goal-list";

export const metadata = { title: "Mục tiêu · Personal Finance" };

export default async function GoalsPage() {
  const { user } = await requireSession();
  const [view, accounts] = await Promise.all([
    listGoalsWithProgress(user.id),
    listActiveAccounts(user.id),
  ]);

  return <GoalList view={view} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />;
}
