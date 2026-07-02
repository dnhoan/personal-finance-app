import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { logger, formatError } from "@/lib/logger";

// Lazy first-sign-in provisioning. Called once per app-shell render after
// requireSession(). Cheap guard: a user with an active account is already
// provisioned, so this is a no-op indexed lookup for returning users. Otherwise
// it runs the idempotent, atomic seed (categories + default Cash account).
//
// This is the trigger of choice over a Better Auth `user.create.after` hook: that
// hook's commit-ordering relative to the user INSERT is unverified, and if it
// fires pre-commit the seed's pooled connection can't see the user row. Running
// here, after the session is established, sidesteps that entirely.
//
// Best-effort: a provisioning failure is logged and swallowed so it never blocks
// the app shell. The seed is atomic, so a failure leaves the user unprovisioned
// (empty state) rather than half-provisioned; the next request retries.
export async function ensureUserProvisioned(userId: string): Promise<void> {
  try {
    const [activeAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), ne(accounts.status, "archived")))
      .limit(1);
    if (activeAccount) return;

    await seed(db, userId);
  } catch (err) {
    logger.error("provisioning", "ensureUserProvisioned failed", {
      userId,
      error: formatError(err),
    });
  }
}
