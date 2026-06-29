import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Guards the cron endpoint. The bearer-missing short-circuit returns before any
// crypto runs, so a malformed request never touches the comparison path. SHA-256
// both sides to fixed 32-byte digests so `timingSafeEqual` gets equal-length
// inputs by construction — no length-leak oracle, no early-return on mismatch.
export function verifyCronSecret(authorizationHeader: string | null): boolean {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;

  const supplied = authorizationHeader.slice("Bearer ".length);
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const expectedDigest = createHash("sha256").update(env.CRON_SECRET).digest();

  return timingSafeEqual(suppliedDigest, expectedDigest);
}
