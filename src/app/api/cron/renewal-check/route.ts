import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recurringRules } from "@/lib/db/schema";
import { cronState } from "@/lib/db/schema/cron-state";
import { verifyCronSecret } from "@/server/auth/verify-cron-secret";
import { allowRequest } from "@/server/cron/rate-limit";
import { runRenewalCheck } from "@/server/cron/run-renewal-check";
import { logger, formatError } from "@/lib/logger";

// Nodemailer (net/tls) requires the Node runtime — must NOT be Edge.
export const runtime = "nodejs";
// Vercel Hobby ceiling. The fan-out is sequential across users; SMTP has bounded
// timeouts (see mailer.ts) so one stalled relay can't consume the whole budget.
// Sized for a small user base (<~10 alert-users); batching/continuation is the
// documented escape hatch if that grows.
export const maxDuration = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

// Today's VN calendar date as "YYYY-MM-DD" — used to gate a same-day re-run.
function ictDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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

  const now = new Date();
  const today = ictDate(now);

  // Same-day short-circuit — but only when the PREVIOUS run COMPLETED. The
  // heartbeat below is written once, after the whole fan-out finishes, so a run
  // truncated by timeout (or one that left failed users) does not set it and can
  // be safely re-triggered the same day. This also bounds the blast radius of a
  // leaked CRON_SECRET / a duplicate cron fire.
  const [state] = await db
    .select({ last: cronState.lastRenewalCheckAt })
    .from(cronState)
    .where(eq(cronState.id, true))
    .limit(1);
  if (state?.last && ictDate(state.last) >= today) {
    return Response.json({ skipped: "already-completed-today" });
  }

  // Fan out only over users who have at least one active rule — nothing to send
  // for anyone else, so they never enter the loop.
  const users = await db
    .selectDistinct({ userId: recurringRules.userId })
    .from(recurringRules)
    .where(eq(recurringRules.active, true));

  let processed = 0;
  let sent = 0;
  let claimedButFailed = 0;
  let failedUsers = 0;

  for (const { userId } of users) {
    try {
      const r = await runRenewalCheck(db, userId, now);
      processed += r.processed;
      sent += r.sent;
      claimedButFailed += r.claimed_but_failed;
    } catch (err) {
      // One user's failure (e.g. missing email, materialise error) must not abort
      // the rest. Record it and move on; the completed-run heartbeat is skipped
      // below so the day can be retried.
      failedUsers++;
      logger.error("cron", "renewal fan-out: user failed", { userId, error: formatError(err) });
    }
  }

  // Heartbeat only on a clean completion (no failed users). UPSERT so it lands
  // even if the singleton row was never seeded. Leaving it unwritten on a partial
  // run keeps the day re-triggerable and surfaces the degradation on the dashboard.
  if (failedUsers === 0) {
    await db.execute(sql`
      INSERT INTO cron_state (id, last_renewal_check_at)
      VALUES (true, now())
      ON CONFLICT (id) DO UPDATE SET last_renewal_check_at = now()
    `);
  }

  return Response.json({
    users: users.length,
    processed,
    sent,
    claimed_but_failed: claimedButFailed,
    failed_users: failedUsers,
  });
}
