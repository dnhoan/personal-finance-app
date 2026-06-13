import { timestamp } from "drizzle-orm/pg-core";

// Reusable created/updated columns. Spread (`...timestamps`) into every domain
// table so every row carries audit timestamps with a uniform definition.
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
