import { TransactionListSkeleton } from "@/features/transactions/components/transaction-list-skeleton";

// Segment loading UI. App Router shows this during the server round-trip when the
// filter bar changes search params, so the list swaps to skeleton rows while the
// re-query runs. The heading + summary band are kept stable to avoid layout shift.
export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Giao dịch
      </h1>
      <div
        aria-hidden="true"
        className="h-[72px] rounded-lg border bg-surface-muted animate-pulse motion-reduce:animate-none"
      />
      <TransactionListSkeleton />
    </div>
  );
}
