// Drizzle schema source of truth (drizzle-kit reads this file). Better Auth's
// tables are defined in auth-schema.ts; domain tables (accounts, transactions, …)
// live in ./schema/*. Both are re-exported here so migrations pick up everything.
// Domain tables anchor their user_id FK to Better Auth's `user` table — single
// identity source, no separate domain users table.
export * from "./auth-schema";
export * from "./schema/index";
