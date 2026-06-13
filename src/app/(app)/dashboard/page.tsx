import Link from "next/link";
import type { Route } from "next";
import { requireSession } from "@/lib/auth-session";
import { listTransactions } from "@/features/transactions/queries";
import { listActiveAccounts } from "@/features/accounts/queries";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { QuickAddLauncher } from "@/features/transactions/components/quick-add-launcher";

export const metadata = { title: "Trang chủ · Personal Finance" };

export default async function DashboardPage() {
  const { user } = await requireSession();
  const [recent, accounts] = await Promise.all([
    listTransactions(user.id, { limit: 10 }),
    listActiveAccounts(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Chào mừng trở lại
      </h1>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Giao dịch gần đây</h2>
          <Link href={"/transactions" as Route} className="text-sm font-medium text-primary">
            Xem tất cả
          </Link>
        </div>
        <TransactionList transactions={recent} />
      </section>

      <QuickAddLauncher accounts={accounts} />
    </div>
  );
}
