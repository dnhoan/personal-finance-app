"use server";
import { requireSession } from "@/lib/auth-session";
import { txFilterSchema } from "../schemas";
import { listTransactionsPage, type TxListItem } from "../queries";
import { TRANSACTIONS_PAGE_SIZE } from "../lib/page-size";

// Loads the next page of transactions for the client ledger's "Tải thêm" button.
// Re-validates the filter with txFilterSchema and enforces the session — the
// client offset/filter are never trusted: offset is clamped, limit is forced to
// the server-owned page size (schema also caps any stray limit at 500).
export async function loadMoreTransactions(input: {
  filter: unknown;
  offset: number;
}): Promise<{ items: TxListItem[]; hasMore: boolean }> {
  const { user } = await requireSession();
  const filter = txFilterSchema.parse(input.filter);
  const offset = Math.max(0, Math.floor(Number(input.offset) || 0));

  return listTransactionsPage(user.id, {
    ...filter,
    limit: TRANSACTIONS_PAGE_SIZE,
    offset,
  });
}
