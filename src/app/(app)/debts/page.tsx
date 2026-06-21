import { requireSession } from "@/lib/auth-session";
import { listDebtsWithBalance } from "@/features/debts/queries";
import { DebtList } from "@/features/debts/components/debt-list";

export const metadata = { title: "Nợ & Vay · Personal Finance" };

export default async function DebtsPage() {
  const { user } = await requireSession();
  const view = await listDebtsWithBalance(user.id);

  return <DebtList view={view} />;
}
