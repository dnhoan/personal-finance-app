// Per-cell CSV neutralisation against spreadsheet formula injection (OWASP).
//
// Excel/LibreOffice evaluate a cell as a formula when its raw text starts with
// `=`, `+`, `-`, `@`, or a leading tab/CR. A crafted merchant/note like
// `=cmd|'/c calc'!A1` would then execute on open. We prefix any such value with a
// single quote so the cell is forced to plain text, then apply standard RFC-4180
// quoting (wrap in double quotes, double any embedded double quote) so embedded
// commas / quotes / newlines stay inside one field.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvEscapeCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (FORMULA_LEAD.test(s)) {
    s = "'" + s;
  }
  return '"' + s.replace(/"/g, '""') + '"';
}
