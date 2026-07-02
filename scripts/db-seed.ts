/**
 * Seed CLI: backfills a user's VN category tree + default account (idempotent).
 * New users are normally provisioned automatically on first sign-in; this is for
 * backfilling existing users or a manual re-run.
 *
 *   npm run db:seed                      # seed ALL users
 *   npm run db:seed -- --email a@b.com   # seed one user by email
 *   npm run db:seed -- --force-prod      # allow a prod DATABASE_URL host
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

// Optional `--email <addr>` seeds a single user; otherwise every user is
// (idempotently) seeded. Provisioning normally happens on first sign-in — this
// script is for backfilling existing users or a manual re-run.
function emailArg(): string | undefined {
  const i = process.argv.indexOf("--email");
  return i >= 0 ? process.argv[i + 1]?.trim().toLowerCase() : undefined;
}

async function main(): Promise<void> {
  assertSafeTarget();

  const only = emailArg();
  const targets = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(only ? eq(user.email, only) : undefined);

  if (targets.length === 0) {
    console.error(only ? `No user found for email ${only}.` : "No users to seed.");
    process.exit(1);
  }

  for (const t of targets) {
    const result = await seed(db, t.id);
    console.log(`Seeded ${t.email}: ${result.categories} new categories.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
