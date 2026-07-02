import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-session";
import { getTransactionDetail } from "@/features/transactions/queries";
import { listActiveAccounts } from "@/features/accounts/queries";
import { TransactionDetailHeader } from "@/features/transactions/components/transaction-detail-header";
import { TransactionDetailFacts } from "@/features/transactions/components/transaction-detail-facts";
import { ENTER, enterDelay } from "@/lib/enter-animation";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { user } = await requireSession();
  const { id } = await params;
  const tx = await getTransactionDetail(user.id, id);
  const label = tx?.categoryName ?? (tx?.kind === "transfer" ? "Chuyển khoản" : "Giao dịch");
  return { title: `${label} · Personal Finance` };
}

// Per-transaction detail: hero amount + facts list, reachable by tapping a ledger
// row. Ownership is enforced in getTransactionDetail (WHERE user_id …); an unknown
// or non-owned id returns null → notFound() with no row-level leak.
export default async function TransactionDetailPage({ params }: { params: Promise<Params> }) {
  const { user } = await requireSession();
  const { id } = await params;

  const [tx, accounts] = await Promise.all([
    getTransactionDetail(user.id, id),
    listActiveAccounts(user.id),
  ]);
  if (!tx) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className={ENTER}>
        <TransactionDetailHeader tx={tx} accounts={accounts} />
      </div>
      <div className={ENTER} style={enterDelay(60)}>
        <TransactionDetailFacts tx={tx} />
      </div>
    </div>
  );
}
