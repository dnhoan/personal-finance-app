import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bankSyncTokens } from "@/lib/db/schema";
import { hashToken } from "@/features/bank-sync/lib/token";
import { logger } from "@/lib/logger";
import {
  MAX_BODY_BYTES,
  MAX_TOKEN_LENGTH,
  sepayWebhookSchema,
} from "@/server/webhooks/sepay/payload-schema";
import { ingestSepayEvent } from "@/server/webhooks/sepay/ingest-event";
import { allowWebhookIp, allowWebhookToken } from "@/server/webhooks/rate-limit";

// node:crypto for the token digest + the Neon WebSocket driver — must not be Edge.
export const runtime = "nodejs";

const AUTH_SCHEME = "Apikey ";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

/**
 * SePay balance-change webhook.
 *
 * Rejection order runs cheapest-first, and that ordering is load-bearing rather
 * than stylistic: the endpoint is publicly documented in /help, and resolving a
 * token costs a database round-trip. Authenticating before rate-limiting — the
 * order the cron route uses — would let any anonymous caller buy a Neon query per
 * request. The cron route can afford it because its check is pure crypto over an
 * env var; this one cannot.
 *
 * Answers 200 for anything already journalled so SePay stops retrying, and never
 * logs payload content, full account numbers, or tokens.
 */
export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();

  // 1. Oversized body — refuse before reading a byte of it.
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return new Response("payload too large", { status: 413 });
  }

  // 2 & 3. Header shape. Both checks are plain string work, so a malformed or
  // absurdly long header never reaches the hash.
  const header = req.headers.get("authorization");
  if (!header?.startsWith(AUTH_SCHEME)) {
    return new Response("unauthorized", { status: 401 });
  }
  const suppliedToken = header.slice(AUTH_SCHEME.length);
  if (suppliedToken.length === 0 || suppliedToken.length > MAX_TOKEN_LENGTH) {
    return new Response("unauthorized", { status: 401 });
  }

  // 4. Coarse anonymous throttle, still ahead of the database.
  if (!allowWebhookIp(clientIp(req))) {
    return new Response("rate limited", { status: 429 });
  }

  // 5. Resolve the token to its owner. A revoked token is excluded by the same
  // predicate, so revocation takes effect on the next delivery.
  const [tokenRow] = await db
    .select({ id: bankSyncTokens.id, userId: bankSyncTokens.userId })
    .from(bankSyncTokens)
    .where(
      and(eq(bankSyncTokens.tokenHash, hashToken(suppliedToken)), isNull(bankSyncTokens.revokedAt)),
    )
    .limit(1);

  if (!tokenRow) {
    return new Response("unauthorized", { status: 401 });
  }

  // 6. Parse. Invalid bodies are rejected before anything is written; the log
  // names the offending field without echoing its value.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const parsed = sepayWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn("webhook", "rejected malformed SePay payload", {
      userId: tokenRow.userId,
      issues: parsed.error.issues.map((i) => i.path.join(".")).join(","),
    });
    return new Response("invalid payload", { status: 400 });
  }

  // Per-token throttle. Unlike the IP gate above, the caller is known here — so
  // the event is journalled first and only then refused, otherwise a throttled
  // delivery would disappear leaving no trace it ever arrived.
  if (!allowWebhookToken(tokenRow.id)) {
    try {
      await ingestSepayEvent(db, tokenRow.userId, parsed.data);
    } catch (err) {
      logger.error("webhook", "failed to journal a rate-limited delivery", {
        userId: tokenRow.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return new Response("rate limited", { status: 429 });
  }

  try {
    const result = await ingestSepayEvent(db, tokenRow.userId, parsed.data);

    // Best-effort usage stamp for the settings screen; never fail a delivery over it.
    void db
      .update(bankSyncTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(bankSyncTokens.id, tokenRow.id))
      .catch(() => {});

    logger.info("webhook", "sepay delivery handled", {
      userId: tokenRow.userId,
      sepayId: parsed.data.id,
      status: result.status,
      durationMs: Date.now() - startedAt,
    });

    // SePay wants both a 2xx and this body shape.
    return Response.json({ success: true });
  } catch (err) {
    logger.error("webhook", "sepay ingest failed", {
      userId: tokenRow.userId,
      sepayId: parsed.data.id,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    // 5xx so SePay retries; the dedupe key makes that safe.
    return new Response("ingest failed", { status: 500 });
  }
}
