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

// Brand palette (light theme) from docs/design-guidelines.md. Inlined as literals
// because email HTML can rely on neither CSS variables nor external stylesheets —
// every colour must be hard-coded inline for mail-client compatibility.
const COLOR = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  border: "#E6E1D8",
  fg: "#1B1D23",
  fgMuted: "#5E5D63",
  fgSubtle: "#8E8B87",
  primary: "#2E3A59",
  primaryFg: "#FAF8F5",
  accent: "#7BA686",
  expense: "#B4423A",
} as const;

const FONT_BODY =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// Fraunces is a web font many mail clients won't load; serif fallbacks keep the
// hero amount distinct (vs. the sans body) even when the web font is unavailable.
const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";

// Format the date column to DD/MM/YYYY by string-split (matches recurring-row's
// `fmtShort`). Do NOT use `new Date(nextDue)` — that re-introduces UTC drift.
function formatDueDate(nextDue: string): string {
  const [y, m, d] = nextDue.split("-");
  return `${d}/${m}/${y}`;
}

// Urgency band. ≤1 day is "đến hạn" red; further out is the calm sage accent.
// Returns both the human countdown phrase and the colour that the eyebrow + pill
// share, so colour is never the sole signal (the phrase carries the same meaning).
function urgency(daysUntil: number): { phrase: string; color: string; icon: string } {
  if (daysUntil <= 0) return { phrase: "Đến hạn hôm nay", color: COLOR.expense, icon: "⚠️" };
  if (daysUntil === 1) return { phrase: "Đến hạn ngày mai", color: COLOR.expense, icon: "⚠️" };
  return { phrase: `Còn ${daysUntil} ngày`, color: COLOR.accent, icon: "🗓️" };
}

/**
 * Build the subject + branded HTML body for a due-renewal alert. All user-supplied
 * text (`note`, falling back to the category name) and the `appUrl` are HTML-escaped
 * — including in the subject — so an injected `<script>` or quote-break renders
 * inert in any mail client.
 *
 * Layout is table-based with fully inline CSS: the only reliable cross-client
 * approach (Gmail/Outlook strip <style> blocks and ignore flexbox/grid).
 */
export function formatRenewalMessage(
  rule: RenewalMessageInput,
  daysUntil: number,
  appUrl: string,
): { subject: string; html: string } {
  const label = escapeHtml(rule.note ?? rule.categoryName ?? "Khoản định kỳ");
  const amount = escapeHtml(formatVnd(rule.amount));
  const dueText = formatDueDate(rule.nextDue);
  const href = escapeHtml(appUrl);
  const { phrase, color, icon } = urgency(daysUntil);

  const subject = `Sắp đến hạn (${phrase.toLowerCase()}): ${label}`;

  const html = `<!doctype html>
<html lang="vi">
<body style="margin:0;padding:0;background:${COLOR.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;font-family:${FONT_BODY};">

        <!-- Brand header -->
        <tr><td style="background:${COLOR.primary};border-radius:20px 20px 0 0;padding:20px 28px;">
          <span style="font-size:16px;font-weight:700;color:${COLOR.primaryFg};letter-spacing:0.01em;">💰&nbsp;Personal Finance</span>
        </td></tr>

        <!-- Card body -->
        <tr><td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-top:none;border-radius:0 0 20px 20px;padding:32px 28px;">

          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${color};">Sắp đến hạn</div>

          <div style="font-size:22px;line-height:28px;font-weight:600;color:${COLOR.fg};margin-top:8px;">${label}</div>

          <div style="font-family:${FONT_DISPLAY};font-size:40px;line-height:44px;font-weight:600;color:${COLOR.primary};margin-top:16px;">${amount}</div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td style="font-size:13px;color:${COLOR.fgSubtle};padding-right:8px;">Đến hạn</td>
              <td style="font-size:15px;font-weight:600;color:${COLOR.fg};">${dueText}</td>
            </tr>
          </table>

          <!-- Urgency pill: colour + icon + text, so colour is never the sole cue -->
          <div style="display:inline-block;margin-top:16px;padding:6px 12px;border-radius:9999px;background:${color};">
            <span style="font-size:13px;font-weight:600;color:#FFFFFF;">${icon}&nbsp;${escapeHtml(phrase)}</span>
          </div>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td style="border-radius:12px;background:${COLOR.primary};">
              <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:${COLOR.primaryFg};text-decoration:none;border-radius:12px;">Xem chi tiết →</a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 28px;">
          <div style="font-size:11px;color:${COLOR.fgSubtle};">Nhắc nhở tự động từ Personal Finance.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
