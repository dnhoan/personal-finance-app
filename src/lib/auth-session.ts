import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { assertAllowlisted, AllowlistError } from "@/lib/auth-allowlist";

export class UnauthorizedError extends Error {
  readonly reason: "no-session" | "not-allowed";
  constructor(reason: "no-session" | "not-allowed") {
    super(reason === "no-session" ? "No active session." : "Account not allowed.");
    this.name = "UnauthorizedError";
    this.reason = reason;
  }
}

export type AuthedSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Authoritative auth gate. Validates the session server-side AND re-checks the
 * allowlist on every call — this catches cookie replay, allowlist env rotation,
 * and expiry that the cheap middleware cookie-presence check cannot. Every
 * Server Action / Route Handler that touches data MUST call this first.
 */
export const requireSession = cache(async (): Promise<AuthedSession> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) {
    throw new UnauthorizedError("no-session");
  }
  try {
    assertAllowlisted(
      { email: result.user.email, emailVerified: result.user.emailVerified },
      env.ALLOWED_EMAIL,
    );
  } catch (e) {
    if (e instanceof AllowlistError) {
      throw new UnauthorizedError("not-allowed");
    }
    throw e;
  }
  return result;
});
