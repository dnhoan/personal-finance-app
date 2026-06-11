// Drizzle schema source of truth. Domain tables (accounts, transactions, …)
// land in Phase 3. Better Auth's tables are defined in auth-schema.ts and
// re-exported here so drizzle-kit (configured to read this file) picks them up.
export * from "./auth-schema";
