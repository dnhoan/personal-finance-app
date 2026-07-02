import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  readonly reason: "no-session";
  constructor(reason: "no-session" = "no-session") {
    super("No active session.");
    this.name = "UnauthorizedError";
    this.reason = reason;
  }
}

export type AuthedSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Authoritative auth gate. Validates the session server-side on every call —
 * `auth.api.getSession` verifies the session cookie/record (catching replay and
 * expiry the cheap middleware cookie-presence check cannot). Every Server Action
 * / Route Handler that touches data MUST call this first.
 */
export const requireSession = cache(async (): Promise<AuthedSession> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) {
    throw new UnauthorizedError("no-session");
  }
  return result;
});
