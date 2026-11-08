import type { TxLedgerItem } from "../queries";
import type { TxEditOptions } from "../lib/to-editable-tx";
import { TransactionRow } from "./transaction-row";
import { TransactionsEmptyState } from "./transactions-empty-state";

// Flat, server-rendered transaction list with a calm empty state — used by the
// dashboard "recent" section. `editOptions` is forwarded to each row's edit sheet.
// (The main transactions screen uses the grouped TransactionLedger instead.)
export function TransactionList({
  transactions,
  editOptions,
}: {
  transactions: TxLedgerItem[];
  editOptions: TxEditOptions;
}) {
  if (transactions.length === 0) return <TransactionsEmptyState />;

  return (
    <ul className="divide-y divide-border">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} editOptions={editOptions} />
      ))}
    </ul>
  );
}
