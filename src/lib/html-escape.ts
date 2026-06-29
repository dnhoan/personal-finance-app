// HTML escaping for user-supplied strings rendered into email bodies, subjects,
// and double-quoted attribute values (e.g. an `href`). Covers the five characters
// that can break markup, inject elements, or break out of a quoted attribute; `&`
// must be replaced first so the entities emitted below are not double-escaped.
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
