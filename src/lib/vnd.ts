/**
 * VND amount parsing + formatting. Pure module, no React.
 *
 * `parseVnd` accepts the shorthand Vietnamese users actually type and returns a
 * whole-VND integer, or `null` when the input is empty/invalid/ambiguous (the
 * caller shows a retype hint). It is a hand-written scanner — NO regex on user
 * input — so it is ReDoS-safe.
 *
 * Suffix multipliers (case-insensitive, optional space before suffix):
 *   k            → 1.000          (nghìn)
 *   tr           → 1.000.000      (triệu)
 *   tỷ / ty      → 1.000.000.000  (tỷ)
 *   chục / chuc  → 10
 *
 * Truth table (✓ = parses, ✗ = null):
 *   "50k"        ✓ 50000        | "1.5tr"      ✓ 1500000   | "1,5tr"   ✓ 1500000
 *   "2 tỷ"       ✓ 2000000000   | "3 chục"     ✓ 30        | "50000"   ✓ 50000
 *   "50.000"     ✓ 50000        | "1.500.000"  ✓ 1500000   | "1,500"   ✓ 1500
 *   "1tr500k"    ✓ 1500000      | "50k500"     ✓ 50500     | "0"       ✓ 0
 *   "1.5"        ✗ (ambiguous: 1.5 or 1500?)  | "1.50"     ✗ (RHS≠3 digits)
 *   "-50k"       ✗ (no negatives) | "1e6"      ✗ (no sci)  | ""        ✗
 *   "   "        ✗ | "1tr.5k"    ✗ (portion starts with separator)
 *   "k"          ✗ (no number)  | "1,5555k"    ✗ (non-integer result)
 *
 * Disambiguation for a BARE number (single portion, no suffix):
 *   - one separator, RHS exactly 3 digits        → thousands  ("50.000" → 50000)
 *   - one separator, RHS ≠ 3 digits              → AMBIGUOUS → null
 *   - multiple separators, all trailing groups 3 → thousands  ("1.500.000")
 *   - no separator                               → integer
 * A separator inside a SUFFIXED portion is always a decimal point.
 */

const SUFFIXES: ReadonlyArray<{ token: string; mult: number }> = [
  // Longest tokens first so "chục" wins before any single-char match.
  { token: "chục", mult: 10 },
  { token: "chuc", mult: 10 },
  { token: "tỷ", mult: 1_000_000_000 },
  { token: "ty", mult: 1_000_000_000 },
  { token: "tr", mult: 1_000_000 },
  { token: "k", mult: 1_000 },
];

const MAX_VND = 999_999_999_999;

// Every character that may legally appear in a suffix — derived from the tokens
// so adding a suffix above can never desync this allow-list.
const SUFFIX_CHARS = new Set(SUFFIXES.flatMap((s) => [...s.token]));

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isSeparator(ch: string): boolean {
  return ch === "." || ch === ",";
}

// Interprets a bare (suffix-less) numeric string per the thousands/decimal rules.
// Returns null when ambiguous or malformed.
function parseBareNumber(s: string): number | null {
  if (s.length === 0) return null;
  const groups = s.split(/[.,]/);
  const sepCount = groups.length - 1;

  if (sepCount === 0) {
    return Number(s);
  }
  if (sepCount === 1) {
    const [left, right] = groups as [string, string];
    if (left.length === 0 || right.length === 0) return null;
    if (right.length === 3) return Number(left + right); // thousands
    return null; // single separator, non-3 RHS → ambiguous
  }
  // Multiple separators → only valid as thousands grouping.
  const [first, ...rest] = groups;
  if (first === undefined || first.length === 0 || first.length > 3) return null;
  if (!rest.every((g) => g.length === 3)) return null;
  return Number(groups.join(""));
}

// Parses the numeric portion of a SUFFIXED group: digits with at most one
// separator, treated as a decimal point. Returns null when malformed.
function parseSuffixedNumber(s: string): number | null {
  if (s.length === 0) return null;
  const groups = s.split(/[.,]/);
  if (groups.length === 1) return Number(s);
  if (groups.length === 2) {
    const [left, right] = groups as [string, string];
    if (left.length === 0 || right.length === 0) return null;
    return Number(`${left}.${right}`);
  }
  return null; // more than one separator in a suffixed portion
}

export function parseVnd(input: string): number | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  // Collapse internal whitespace ("2 tỷ" → "2tỷ"), lowercase for suffix match.
  const s = raw.replace(/\s+/g, "").toLowerCase();
  if (s.length === 0) return null;

  // Reject anything that isn't a digit, separator, or a known suffix char.
  // (Catches "-", "e", "+", currency glyphs, letters outside suffixes.)
  for (const ch of s) {
    if (!isDigit(ch) && !isSeparator(ch) && !SUFFIX_CHARS.has(ch)) {
      return null;
    }
  }

  let i = 0;
  let total = 0;
  let portions = 0;

  while (i < s.length) {
    // Read a numeric portion: digits + separators.
    const start = i;
    while (i < s.length && (isDigit(s[i]!) || isSeparator(s[i]!))) i++;
    const numStr = s.slice(start, i);
    if (numStr.length === 0) return null; // a suffix with no leading number

    // Read an optional suffix.
    let matched: { token: string; mult: number } | undefined;
    for (const suf of SUFFIXES) {
      if (s.startsWith(suf.token, i)) {
        matched = suf;
        break;
      }
    }

    if (matched) {
      const n = parseSuffixedNumber(numStr);
      if (n === null) return null;
      total += n * matched.mult;
      i += matched.token.length;
    } else {
      // A suffix-less portion. As the trailing remainder of a composite
      // (e.g. the "500" in "50k500") it's a plain integer; as the sole portion
      // it goes through bare-number disambiguation.
      if (portions === 0) {
        const n = parseBareNumber(numStr);
        if (n === null) return null;
        total += n;
      } else {
        const n = parseBareNumber(numStr);
        if (n === null || !Number.isInteger(n)) return null;
        total += n;
      }
    }
    portions++;
  }

  // A bare number that survived but is itself non-integer can't happen
  // (parseBareNumber yields integers); suffixed decimals can (e.g. 1,5555k).
  if (!Number.isInteger(total)) return null;
  if (total < 0 || total > MAX_VND) return null;

  return total;
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Formats a whole-VND amount as canonical `50.000 ₫`. */
export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}
