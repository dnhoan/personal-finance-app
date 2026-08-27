import { requireSession } from "@/lib/auth-session";
import { listCategoriesFlat } from "@/features/categories/queries";
import { topCategoriesThisMonth } from "@/features/reports/queries";
import {
  countUnmatchedEvents,
  hasAnyBankLink,
  listPendingTransactions,
} from "@/features/bank-sync/inbox-queries";
import { InboxList } from "@/features/bank-sync/components/inbox-list";
import { UnmatchedEventsNotice } from "@/features/bank-sync/components/unmatched-events-notice";
import { BackLink } from "@/components/app-shell/back-link";
import { ENTER, enterDelay } from "@/lib/enter-animation";

export const metadata = { title: "Chờ phân loại · Personal Finance" };

// Review queue for bank-synced transactions. These rows already count toward
// balances — the money moved — but stay out of the ledger and every
// category report until a category is chosen here.
export default async function InboxPage() {
  const { user } = await requireSession();

  const [pending, allCategories, topCategories, unmatchedCount, linked] = await Promise.all([
    listPendingTransactions(user.id),
    listCategoriesFlat(user.id),
    topCategoriesThisMonth(user.id, 6),
    countUnmatchedEvents(user.id),
    hasAnyBankLink(user.id),
  ]);

  // Quick-assign chips: the categories this user actually reaches for, so the
  // common case is one tap. Falls back to the first few categories for a user
  // with no spending history yet.
  const topIds = new Set(topCategories.map((c) => c.categoryId));
  const suggestions = allCategories.filter((c) => topIds.has(c.id));
  const fallback = allCategories.filter((c) => !topIds.has(c.id));

  return (
    <div className="flex flex-col gap-5">
      <header className={ENTER}>
        <BackLink href="/transactions" label="Chờ phân loại" />
        <p className="mt-1 text-sm text-fg-muted">
          Giao dịch từ ngân hàng đã được tính vào số dư, nhưng chưa vào sổ và báo cáo cho tới khi
          bạn chọn danh mục.
        </p>
      </header>

      <div className={ENTER} style={enterDelay(60)}>
        <UnmatchedEventsNotice count={unmatchedCount} />
      </div>

      <div className={ENTER} style={enterDelay(120)}>
        <InboxList
          transactions={pending}
          categories={allCategories}
          suggestions={[...suggestions, ...fallback]}
          hasLink={linked}
        />
      </div>
    </div>
  );
}
