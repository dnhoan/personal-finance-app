import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-session";
import {
  getAccountWithBalance,
  getAccountMonthStats,
  listActiveAccounts,
} from "@/features/accounts/queries";
import { listTransactions } from "@/features/transactions/queries";
import { AccountDetailHeader } from "@/features/accounts/components/account-detail-header";
import { AccountMonthStats } from "@/features/accounts/components/account-month-stats";
import { GroupedTransactionList } from "@/features/transactions/components/grouped-transaction-list";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { user } = await requireSession();
  const { id } = await params;
  const account = await getAccountWithBalance(user.id, id);
  return { title: `${account?.name ?? "Tài khoản"} · Personal Finance` };
}

// Per-account detail: gradient hero + quick-action pills + this-month money in/out
// + date-grouped history. Ownership is enforced in the queries (WHERE user_id …);
// an unknown or non-owned id returns null → notFound() with no row-level leak.
export default async function AccountDetailPage({ params }: { params: Promise<Params> }) {
  const { user } = await requireSession();
  const { id } = await params;

  const account = await getAccountWithBalance(user.id, id);
  if (!account) notFound();

  const [stats, transactions, accounts] = await Promise.all([
    getAccountMonthStats(user.id, id),
    listTransactions(user.id, { accountId: id }),
    listActiveAccounts(user.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <AccountDetailHeader account={account} accounts={accounts} />
      <AccountMonthStats stats={stats} />
      <section>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          Lịch sử
        </p>
        <GroupedTransactionList transactions={transactions} accounts={accounts} />
      </section>
    </div>
  );
}
