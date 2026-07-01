// Generates a RFC 4122 v4 UUID.
//
// `crypto.randomUUID()` is only defined in secure contexts (HTTPS or localhost).
// When the app is opened over plain HTTP on a LAN IP (common on mobile during
// dev), the `crypto` global still exists but `randomUUID` is undefined. We fall
// back to building a v4 UUID from `crypto.getRandomValues`, then to `Math.random`
// as a last resort so callers always get a schema-valid uuid string.
export function randomUuid(): string {
  const c = globalThis.crypto;

  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant (RFC 4122) bits.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}
