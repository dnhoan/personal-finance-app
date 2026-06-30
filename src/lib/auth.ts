import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user, session, account, verification } from "@/lib/db/auth-schema";
import { env } from "@/lib/env";
import { assertAllowlisted, AllowlistError } from "@/lib/auth-allowlist";

// Maps an AllowlistError to a Better Auth FORBIDDEN response; rethrows anything else.
function rejectAsForbidden(e: unknown): never {
  if (e instanceof AllowlistError) {
    throw new APIError("FORBIDDEN", { message: e.message });
  }
  throw e;
}

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
      // Always show Google's account chooser. Without this, after a rejected
      // (non-allowlisted) sign-in Google silently re-authorizes the same active
      // account on the next attempt, so the user can never switch to the allowed
      // one — every retry loops back to /unauthorized.
      prompt: "select_account",
    },
  },
  // 30-day rolling session: re-extended once per day of activity.
  session: {
    expiresIn: THIRTY_DAYS_SECONDS,
    updateAge: ONE_DAY_SECONDS,
  },
  // Single-account allowlist enforced on EVERY sign-in, not just the first:
  //  - user.create.before    → rejects a disallowed account at first sign-in,
  //    when Google's profile email first becomes known (the /sign-in/social
  //    request middleware has no email yet, so this is the right hook).
  //  - session.create.before → rejects a *returning* disallowed account before
  //    any session is minted (e.g. after ALLOWED_EMAIL is rotated to narrow it),
  //    since create.before does not re-fire for an existing user row.
  // Together they guarantee a rejected identity never receives a session cookie;
  // requireSession() then re-checks per request as final defense-in-depth.
  databaseHooks: {
    user: {
      create: {
        before: async (candidate) => {
          try {
            assertAllowlisted(
              { email: candidate.email, emailVerified: candidate.emailVerified },
              env.ALLOWED_EMAIL,
            );
          } catch (e) {
            rejectAsForbidden(e);
          }
          return { data: candidate };
        },
      },
    },
    session: {
      create: {
        before: async (candidate) => {
          const [owner] = await db
            .select({ email: user.email, emailVerified: user.emailVerified })
            .from(user)
            .where(eq(user.id, candidate.userId))
            .limit(1);
          if (!owner) {
            throw new APIError("FORBIDDEN", { message: "Account not allowed." });
          }
          try {
            assertAllowlisted(owner, env.ALLOWED_EMAIL);
          } catch (e) {
            rejectAsForbidden(e);
          }
          return { data: candidate };
        },
      },
    },
  },
  // nextCookies must be the last plugin so it can flush Set-Cookie headers.
  plugins: [nextCookies()],
});
