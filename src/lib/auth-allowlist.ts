// Pure allowlist gate — no env, no DB imports so it stays unit-testable in
// isolation. Both auth.ts (sign-in databaseHook) and auth-session.ts
// (per-request revalidation) call this with env.ALLOWED_EMAIL.

export class AllowlistError extends Error {
  readonly reason: "email-mismatch" | "email-unverified";
  constructor(reason: "email-mismatch" | "email-unverified") {
    super(
      reason === "email-unverified"
        ? "Email address is not verified."
        : "This account is not allowed.",
    );
    this.name = "AllowlistError";
    this.reason = reason;
  }
}

export interface AllowlistCandidate {
  email: string;
  emailVerified: boolean;
}

const normalize = (email: string): string => email.trim().toLowerCase();

/**
 * Throws AllowlistError unless the candidate is the single allowed, verified
 * account. Email comparison is case- and whitespace-insensitive on both sides.
 */
export function assertAllowlisted(candidate: AllowlistCandidate, allowedEmail: string): void {
  if (candidate.emailVerified !== true) {
    throw new AllowlistError("email-unverified");
  }
  if (normalize(candidate.email) !== normalize(allowedEmail)) {
    throw new AllowlistError("email-mismatch");
  }
}

/** Non-throwing variant for cheap boolean checks (e.g. middleware-adjacent). */
export function isAllowlisted(candidate: AllowlistCandidate, allowedEmail: string): boolean {
  try {
    assertAllowlisted(candidate, allowedEmail);
    return true;
  } catch {
    return false;
  }
}
