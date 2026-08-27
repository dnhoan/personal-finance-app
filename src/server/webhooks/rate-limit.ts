// In-memory fixed-window limiters for the public webhook endpoint.
//
// DEFENSE-IN-DEPTH ONLY — this state is per lambda instance and survives neither
// cold starts nor concurrent instances. The real authorization boundary is the
// per-user token plus the (user_id, sepay_id) dedupe key.
//
// Deliberately NOT the cron limiter in src/server/cron/rate-limit.ts. That one
// allows 10 req/60s keyed by IP, sized for "one scheduled call per day". SePay
// delivers every user's traffic from a shared egress IP, so reusing it would
// return 429 during exactly the busy stretch that matters — and a rejected
// delivery is lost for good, because v1 has no backfill.

const WINDOW_MS = 60_000;

// Coarse anonymous guard, applied before any database work. High enough that a
// real burst across all users passes; low enough to blunt a flood.
const MAX_PER_IP = 120;

// Applied once the token identifies a user. Far above any plausible personal
// transaction volume, so a legitimate user cannot hit it.
const MAX_PER_TOKEN = 300;

type Bucket = { count: number; windowStart: number };

const ipBuckets = new Map<string, Bucket>();
const tokenBuckets = new Map<string, Bucket>();

function allow(buckets: Map<string, Bucket>, key: string, max: number, now: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

/** Coarse pre-auth gate keyed by client IP. Counts the request when allowed. */
export function allowWebhookIp(ip: string, now: number = Date.now()): boolean {
  return allow(ipBuckets, ip, MAX_PER_IP, now);
}

/**
 * Post-auth gate keyed by token id.
 *
 * A rejection here happens AFTER the caller has been identified, so the caller
 * must still journal the event before returning 429 — otherwise a throttled
 * delivery vanishes with no record that it ever arrived.
 */
export function allowWebhookToken(tokenId: string, now: number = Date.now()): boolean {
  return allow(tokenBuckets, tokenId, MAX_PER_TOKEN, now);
}

// Test-only: drop accumulated state so each case starts clean.
export function _resetWebhookRateLimit(): void {
  ipBuckets.clear();
  tokenBuckets.clear();
}
