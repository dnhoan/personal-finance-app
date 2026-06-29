import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/server/auth/verify-cron-secret";
import { allowRequest } from "@/server/cron/rate-limit";
import { runRenewalCheck } from "@/server/cron/run-renewal-check";

// Nodemailer (net/tls) requires the Node runtime — must NOT be Edge.
export const runtime = "nodejs";
// Vercel Hobby ceiling. SMTP send (~300-800ms) × ≤10 rules stays well under.
export const maxDuration = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request): Promise<Response> {
  // Auth first: a bad secret is rejected before it can consume the shared-IP rate
  // bucket, so an unauthenticated caller on the cron egress IP cannot starve the
  // legitimate daily run with a 429. The limiter is then defense-in-depth against
  // a flood from an *authenticated* caller.
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return new Response("unauthorized", { status: 401 });
  }

  if (!allowRequest(clientIp(req))) {
    return new Response("rate limited", { status: 429 });
  }

  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, env.ALLOWED_EMAIL))
    .limit(1);

  if (!owner) {
    return new Response("owner not found", { status: 500 });
  }

  const result = await runRenewalCheck(db, owner.id);
  return Response.json(result);
}
