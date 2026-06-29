"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import type { TxListItem } from "../queries";
import type { TxFilter } from "../schemas";
import { groupTransactionsByDay } from "../lib/group-by-day";
import { loadMoreTransactions } from "../actions";
import { TransactionDayGroups } from "./transaction-day-groups";
import { TransactionsEmptyState } from "./transactions-empty-state";

// The active filter, minus pagination — the ledger owns limit/offset itself.
export type LedgerFilter = Pick<TxFilter, "from" | "to" | "kind" | "accountId" | "categoryId">;

// Client ledger for the main transactions list. Renders the server-fetched first
// page, then appends older pages via the loadMoreTransactions action. Grouping is
// recomputed from the full accumulated array each render, so a page that lands on
// an existing day's boundary merges in and that day's subtotal recomputes
// automatically.
export function TransactionLedger({
  initialItems,
  initialHasMore,
  filter,
  accounts,
}: {
  initialItems: TxListItem[];
  initialHasMore: boolean;
  filter: LedgerFilter;
  accounts: { id: string; name: string }[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [isPending, startTransition] = React.useTransition();

  // A new server response (filter change or revalidation) resets the ledger to
  // its first page. Deps are the server-provided props, stable across client-only
  // re-renders, so appended pages are never dropped mid-session.
  React.useEffect(() => {
    setItems(initialItems);
    setHasMore(initialHasMore);
  }, [initialItems, initialHasMore]);

  function loadMore() {
    startTransition(async () => {
      const res = await loadMoreTransactions({ filter, offset: items.length });
      setItems((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
    });
  }

  if (items.length === 0) return <TransactionsEmptyState />;

  return (
    <div className="flex flex-col gap-4">
      <TransactionDayGroups groups={groupTransactionsByDay(items)} accounts={accounts} />
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isPending}
          className="mx-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-fg-muted transition-colors hover:border-fg-subtle disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isPending && (
            <Loader2
              size={16}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {isPending ? "Đang tải…" : "Tải thêm"}
        </button>
      )}
    </div>
  );
}
