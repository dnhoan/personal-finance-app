/**
 * CI-only migration runner against a STANDARD Postgres target (e.g. the throwaway
 * service container in the migration-check workflow).
 *
 * The app + `drizzle-kit migrate` use the @neondatabase/serverless driver, which
 * speaks Neon's WebSocket protocol and cannot connect to a vanilla Postgres
 * server. This script applies the same `drizzle/` migrations over the normal
 * Postgres wire protocol via node-postgres, so CI can prove migrations run
 * cleanly on a fresh DB without any Neon key or prod data.
 *
 * Reads DATABASE_URL from the environment. Not for production use — prod
 * migrations go through `npm run db:migrate` against the Neon endpoint.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied to the standard Postgres target.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
