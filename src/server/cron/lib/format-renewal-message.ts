import { escapeHtml } from "@/lib/html-escape";
import { formatVnd } from "@/lib/vnd";

// Minimal shape needed to render an alert. `nextDue` is a `date` column, i.e. a
// `YYYY-MM-DD` string — never a `Date`. Formatting by string-split avoids the
// UTC-boundary day-drift the codebase deliberately sidesteps for date columns.
export type RenewalMessageInput = {
  amount: number;
  note: string | null;
  categoryName: string | null;
  /** "YYYY-MM-DD" */
  nextDue: string;
};

// Format the date column to DD/MM/YYYY by string-split (matches recurring-row's
// `fmtShort`). Do NOT use `new Date(nextDue)` — that re-introduces UTC drift.
function formatDueDate(nextDue: string): string {
  const [y, m, d] = nextDue.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Build the subject + HTML body for a due-renewal alert. All user-supplied text
 * (`note`, falling back to the category name) is HTML-escaped — including in the
 * subject — so an injected `<script>` renders inert in any mail client.
 */
export function formatRenewalMessage(
  rule: RenewalMessageInput,
  daysUntil: number,
): { subject: string; html: string } {
  const label = escapeHtml(rule.note ?? rule.categoryName ?? "Khoản định kỳ");
  const amount = formatVnd(rule.amount);
  const dueText = formatDueDate(rule.nextDue);
  const dayWord = daysUntil === 1 ? "day" : "days";

  const subject = `Bill due in ${daysUntil} ${dayWord}: ${label}`;
  const html = [
    `<h2>Bill due in ${daysUntil} ${dayWord}</h2>`,
    `<p>${label}</p>`,
    `<p><strong>${escapeHtml(amount)}</strong></p>`,
    `<p>${dueText}</p>`,
  ].join("\n");

  return { subject, html };
}
