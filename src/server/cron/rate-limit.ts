// In-memory fixed-window rate limiter keyed by client IP.
//
// DEFENSE-IN-DEPTH ONLY — this state lives per lambda instance and does NOT
// survive cold starts or span concurrent instances on Vercel. The real auth
// guard is the SHA-256-then-timingSafeEqual cron-secret check. cron-job.org
// fires once/day for a single user, so per-instance throttling is sufficient
// for MVP. A durable limiter (@upstash/ratelimit) is deferred.

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

/**
 * Returns true if the request from `ip` is within the limit (allowed), false if
 * it should be rejected (429). Counts the current request when allowed.
 */
export function allowRequest(ip: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count++;
  return true;
}

// Test-only: drop accumulated state so each case starts clean.
export function _resetRateLimit(): void {
  buckets.clear();
}
