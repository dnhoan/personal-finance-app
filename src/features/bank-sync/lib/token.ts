import { randomBytes, createHash } from "node:crypto";

// Identifies our own tokens at a glance in the SePay dashboard, and lets the
// webhook reject a malformed header on a string compare before doing any crypto.
export const TOKEN_PREFIX = "pfa_";

// 32 random bytes, base64url (43 chars) behind the prefix. Generated with the
// CSPRNG — this value is the only thing standing between the public webhook and
// a user's ledger.
export function generateWebhookToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

// Only the digest is stored. A database leak then yields nothing replayable
// against the webhook, and the unique index on the digest doubles as the
// token → user lookup.
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
