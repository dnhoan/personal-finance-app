import { db } from "@/lib/db/client";
import { requireSession } from "@/lib/auth-session";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { listTransactionsPage, summariseTransactions } from "@/features/transactions/queries";
import { TRANSACTIONS_PAGE_SIZE } from "@/features/transactions/lib/page-size";
import { listActiveAccounts } from "@/features/accounts/queries";
import { listCategoriesFlat } from "@/features/categories/queries";
import { listActiveGoals } from "@/features/goals/queries";
import {
  resolveDateRange,
  RANGE_PRESETS,
  type RangePreset,
} from "@/features/transactions/date-range";
import { TransactionLedger } from "@/features/transactions/components/transaction-ledger";
import { TransactionSummary } from "@/features/transactions/components/transaction-summary";
import { TransactionFilters } from "@/features/transactions/components/transaction-filters";
import { QuickAddLauncher } from "@/features/transactions/components/quick-add-launcher";

export const metadata = { title: "Giao dịch · Personal Finance" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["income", "expense", "transfer"] as const;

type SearchParams = Record<string, string | undefined>;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;

  // Surface any newly-due recurring instances in the ledger. Best-effort: a
  // failure logs but must not block the list. Idempotent + advisory-locked, so a
  // concurrent call (recurring page / cron) is a safe no-op.
  try {
    await materialiseDueInstances(db, user.id);
    console.debug("materialiseDueInstances (transactions page) succeeded");
  } catch (err) {
    console.error("materialiseDueInstances (transactions page) failed", err);
  }

  const preset: RangePreset = RANGE_PRESETS.includes(sp.range as RangePreset)
    ? (sp.range as RangePreset)
    : "month";
  const { from, to } = resolveDateRange(preset, sp.from, sp.to);
  const kind = (KINDS as readonly string[]).includes(sp.kind ?? "")
    ? (sp.kind as (typeof KINDS)[number])
    : undefined;
  const accountId = sp.accountId && UUID_RE.test(sp.accountId) ? sp.accountId : undefined;
  const categoryId = sp.categoryId && UUID_RE.test(sp.categoryId) ? sp.categoryId : undefined;

  const filter = { from, to, kind, accountId, categoryId };
  const [page, summary, accounts, categories, goals] = await Promise.all([
    listTransactionsPage(user.id, { ...filter, limit: TRANSACTIONS_PAGE_SIZE }),
    summariseTransactions(user.id, filter),
    listActiveAccounts(user.id),
    listCategoriesFlat(user.id),
    listActiveGoals(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-fg" style={{ fontFamily: "var(--font-serif)" }}>
        Giao dịch
      </h1>
      <TransactionFilters accounts={accounts} categories={categories} />
      <TransactionSummary summary={summary} />
      <TransactionLedger
        initialItems={page.items}
        initialHasMore={page.hasMore}
        filter={filter}
        accounts={accounts}
      />
      <QuickAddLauncher accounts={accounts} categories={categories} goals={goals} />
    </div>
  );
}
