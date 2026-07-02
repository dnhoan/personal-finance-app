import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/html-escape";

// Outbound-only mailer over Brevo's SMTP relay. STARTTLS upgrade happens on 587
// (`secure: false`), so the transport stays plaintext until the upgrade. Nodemailer
// uses Node `net`/`tls`, so any route importing this MUST run on the Node runtime.
const transport = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // STARTTLS upgrade on 587
  auth: { user: env.BREVO_SMTP_USER, pass: env.BREVO_SMTP_KEY },
  // Bounded timeouts so a stalled relay throws instead of hanging — critical for
  // the daily cron, which now fans out over all users inside one 60s function:
  // one slow send must not consume the whole budget and starve later users.
  connectionTimeout: 7000,
  greetingTimeout: 7000,
  socketTimeout: 7000,
});

// Distinct error type so callers can tell an SMTP send failure apart from a
// programming error and decide skip-vs-fail per rule.
export class MailError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MailError";
  }
}

/**
 * Send one HTML email from the verified sender to `to`. Throws `MailError` on any
 * SMTP failure — the caller decides whether to skip or fail. Never swallows the
 * error here.
 */
export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await transport.sendMail({
      from: env.ALERT_FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MailError(message, { cause: err });
  }
}

export { escapeHtml };
