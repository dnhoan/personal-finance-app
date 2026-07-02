import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { db } from "@/lib/db/client";
import { user, session, account, verification } from "@/lib/db/auth-schema";
import { env } from "@/lib/env";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const ONE_DAY_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  // Google-only; no password auth surface.
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Always show Google's account chooser so a user can pick which account to
      // sign in with (and switch accounts) instead of being silently re-authorized
      // as the last-active Google account.
      prompt: "select_account",
    },
  },
  // 30-day rolling session: re-extended once per day of activity.
  session: {
    expiresIn: THIRTY_DAYS_SECONDS,
    updateAge: ONE_DAY_SECONDS,
  },
  // Open signup: any Google account may sign in and gets an isolated workspace.
  // The only gate is a kill-switch — set SIGNUP_ENABLED=false to halt NEW user
  // creation (existing users unaffected) as a non-destructive rollback lever.
  // Existing users keep signing in because create.before fires only for new rows.
  databaseHooks: {
    user: {
      create: {
        before: async (candidate) => {
          if (!env.SIGNUP_ENABLED) {
            throw new APIError("FORBIDDEN", { message: "Signups are currently disabled." });
          }
          return { data: candidate };
        },
      },
    },
  },
  // nextCookies must be the last plugin so it can flush Set-Cookie headers.
  plugins: [nextCookies()],
});
