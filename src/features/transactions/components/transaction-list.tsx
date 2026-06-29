import type { TxListItem } from "../queries";
import { TransactionRow } from "./transaction-row";
import { TransactionsEmptyState } from "./transactions-empty-state";

// Flat, server-rendered transaction list with a calm empty state — used by the
// dashboard "recent" section. `accounts` is forwarded to each row's edit sheet.
// (The main transactions screen uses the grouped TransactionLedger instead.)
export function TransactionList({
  transactions,
  accounts,
}: {
  transactions: TxListItem[];
  accounts: { id: string; name: string }[];
}) {
  if (transactions.length === 0) return <TransactionsEmptyState />;

  return (
    <ul className="divide-y divide-border">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} accounts={accounts} />
      ))}
    </ul>
  );
}
