// Minimal HTML escaping for user-supplied strings rendered into email bodies and
// subjects. Covers the three characters that can break markup or inject elements;
// `&` must be replaced first so the entities emitted below are not double-escaped.
export function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
