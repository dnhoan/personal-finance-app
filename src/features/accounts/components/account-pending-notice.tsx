import { formatVnd } from "@/lib/vnd";
import type { AccountPendingSummary } from "../queries";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// Reconciles the two halves of the account page. The hero balance includes
// pending bank-sync rows (the money really moved); the history list below
// excludes them (they have no category yet). This line names that gap, so the
// difference reads as pending work rather than lost data. Renders nothing when
// there is nothing pending.
//
// Not a link yet: the review inbox does not exist at this point, and typed
// routes reject an href that has no route. It becomes a link to /inbox when that
// page lands.
export function AccountPendingNotice({ summary }: { summary: AccountPendingSummary }) {
  if (summary.count === 0) return null;

  const sign = summary.total < 0 ? MINUS : "+";

  return (
    <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted">
      <span className="font-semibold text-fg">{summary.count} giao dịch</span> chờ phân loại ·{" "}
      <span className="tabular-nums">
        {sign} {formatVnd(Math.abs(summary.total))}
      </span>{" "}
      — đã tính vào số dư
    </p>
  );
}
