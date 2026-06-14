// Vietnamese-aware slugify: "Cà phê & Trà" → "ca-phe-tra". Strips diacritics via
// Unicode NFD decomposition (đ/Đ don't decompose, so handle them explicitly),
// lowercases, and collapses any run of non-alphanumerics to a single hyphen.
export function slugify(input: string): string {
  return input
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
