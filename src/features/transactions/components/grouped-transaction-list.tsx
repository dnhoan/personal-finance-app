import type { TxListItem } from "../queries";
import { groupTransactionsByDay } from "../lib/group-by-day";
import { TransactionDayGroups } from "./transaction-day-groups";
import { TransactionsEmptyState } from "./transactions-empty-state";

// Date-grouped history for the account detail page: a day header (relative label
// + net subtotal) above each day's Card of rows. Delegates to the shared
// TransactionDayGroups so rows + grouping never diverge from the main list.
export function GroupedTransactionList({
  transactions,
  accounts,
}: {
  transactions: TxListItem[];
  accounts: { id: string; name: string }[];
}) {
  if (transactions.length === 0) return <TransactionsEmptyState />;

  return (
    <TransactionDayGroups groups={groupTransactionsByDay(transactions)} accounts={accounts} card />
  );
}
