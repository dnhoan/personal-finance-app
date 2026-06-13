/**
 * Seed CLI: populates the owner's VN category tree + cron_state heartbeat row.
 *
 *   npm run db:seed              # refuses to run against a non-dev DATABASE_URL
 *   npm run db:seed -- --force-prod   # explicit override for a prod host
 *
 * Finds the owner row (created by Better Auth on first allowed sign-in) by
 * ALLOWED_EMAIL, then runs the idempotent seed. Sign in once before seeding.
 */
import "./load-env";

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { user } from "../src/lib/db/auth-schema";
import { seed } from "../src/lib/db/seed";
import { env } from "../src/lib/env";

// Guard against seeding the wrong database. Neon endpoint hosts always end in
// "neon.tech" (branch name is NOT encoded in the host), so we permit any Neon
// host but refuse one that looks like production. Non-Neon targets (a local
// Postgres typo, a borrowed connection string) are blocked too. --force-prod
// bypasses both checks for a deliberate production seed.
function assertSafeTarget(): void {
  if (process.argv.includes("--force-prod")) return;
  const host = new URL(env.DATABASE_URL).host.toLowerCase();
  const refuse = (why: string): never => {
    console.error(
      `Refusing to seed: ${why} (host "${host}").\nRe-run with --force-prod if intentional.`,
    );
    process.exit(1);
  };
  if (!host.includes("neon.tech")) refuse("DATABASE_URL is not a Neon host");
  if (host.includes("prod")) refuse("DATABASE_URL host looks like production");
}

async function main(): Promise<void> {
  assertSafeTarget();

  const [owner] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, env.ALLOWED_EMAIL))
    .limit(1);

  if (!owner) {
    console.error(
      `Owner not found for ALLOWED_EMAIL=${env.ALLOWED_EMAIL}. ` +
        `Sign in with Google once to create the user row, then re-run.`,
    );
    process.exit(1);
  }

  const result = await seed(db, owner.id);
  console.log(`Seeded owner ${owner.email}: ${result.categories} new categories + cron_state row.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
