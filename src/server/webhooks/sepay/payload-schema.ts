import { z } from "zod";
import { MAX_VND } from "@/features/transactions/schemas";
import { parseIctDateTime } from "@/lib/month";

// Every field is bounded on purpose. Signup is open, so any registered user can
// mint a token in seconds; without these caps that token is an unbounded
// JSON-write primitive against a shared database. The 90-day retention on
// bank_sync_events is the other half of that defence.
const vndAmount = z.number().finite().nonnegative().max(MAX_VND);

// "2023-03-25 14:02:37" — ICT wall clock, no offset. Matched with a strict regex
// rather than handed to the Date parser, because `new Date("25/03/2023")` yields
// an Invalid Date silently instead of throwing.
const ICT_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;

// Renders an instant back into ICT wall-clock parts, for the round-trip check below.
const ICT_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * True only when `value` names an instant that actually exists.
 *
 * The regex alone is not enough, and neither is a NaN check: JS rejects month 13
 * and day 32, but silently ROLLS OVER a day that overflows its month, so
 * "2026-02-30" becomes 2 March. Formatting the parsed instant back to ICT and
 * demanding it match the input catches that, and costs one format per delivery.
 */
function isRealIctTimestamp(value: string): boolean {
  const parsed = parseIctDateTime(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return ICT_PARTS.format(parsed).replace(", ", " ") === value.replace("T", " ");
}

export const sepayWebhookSchema = z
  .object({
    // SePay sends this as a number; coerced to string because it is stored and
    // compared as the dedupe key.
    id: z.union([z.number(), z.string()]).transform(String).pipe(z.string().min(1).max(64)),
    gateway: z.string().min(1).max(64),
    transactionDate: z
      .string()
      .regex(ICT_TIMESTAMP_RE, "transactionDate must be YYYY-MM-DD HH:mm:ss"),
    accountNumber: z.string().min(1).max(32),
    code: z.string().max(64).nullish(),
    content: z.string().max(2000).nullish(),
    transferType: z.enum(["in", "out"]),
    transferAmount: vndAmount,
    // The bank's own running balance. Optional: not every bank sends it.
    accumulated: vndAmount.nullish(),
    // Recorded in the payload but unused in v1.
    subAccount: z.string().max(64).nullish(),
    referenceCode: z.string().max(128).nullish(),
    description: z.string().max(2000).nullish(),
  })
  // The regex admits shapes the calendar does not. Reject those here so the
  // insert cannot blow up mid-transaction, and so a rolled-over date cannot
  // quietly file a transaction under the wrong day.
  .refine((v) => isRealIctTimestamp(v.transactionDate), {
    path: ["transactionDate"],
    message: "transactionDate is not a real date",
  });

export type SepayWebhookPayload = z.infer<typeof sepayWebhookSchema>;

// Largest body accepted, checked against Content-Length before the body is read.
export const MAX_BODY_BYTES = 16 * 1024;

// An Apikey header longer than this is rejected before hashing — a multi-KB
// token is never legitimate, and hashing it first would be free work for an
// attacker.
export const MAX_TOKEN_LENGTH = 200;
