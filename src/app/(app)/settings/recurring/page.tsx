import { db } from "@/lib/db/client";
import { requireSession } from "@/lib/auth-session";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import { materialiseDueInstances } from "@/features/recurring/lib/materialise";
import { listRecurringRules } from "@/features/recurring/queries";
import { listActiveAccounts } from "@/features/accounts/queries";
import { listCategoriesFlat } from "@/features/categories/queries";
import { RecurringList } from "@/features/recurring/components/recurring-list";

export const metadata = { title: "Định kỳ · Personal Finance" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams = Record<string, string | undefined>;

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const initialEditId = sp.edit && UUID_RE.test(sp.edit) ? sp.edit : undefined;

  // Lazily generate any due instances before reading the list. Best-effort: a
  // failure logs but must not block the page.
  try {
    await materialiseDueInstances(db, user.id);
    console.debug("materialiseDueInstances (recurring page) succeeded");
  } catch (err) {
    console.error("materialiseDueInstances (recurring page) failed", err);
  }

  const [{ rules, summary }, accounts, categories] = await Promise.all([
    listRecurringRules(user.id),
    listActiveAccounts(user.id),
    listCategoriesFlat(user.id),
  ]);

  const net = summary.net30;
  const netNegative = net < 0;

  return (
    <RecurringList
      rules={rules}
      accounts={accounts}
      categories={categories}
      initialEditId={initialEditId}
    >
      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          30 ngày tới
        </p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold tabular-nums",
            netNegative ? "text-expense" : "text-income",
          )}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {netNegative ? "− " : "+ "}
          {formatVnd(Math.abs(net))}
        </p>
        <p className="mt-1 text-[12px] text-fg-muted">
          {summary.activeCount} quy tắc hoạt động · {summary.dueSoonCount} sắp đến hạn
        </p>
      </section>
    </RecurringList>
  );
}
