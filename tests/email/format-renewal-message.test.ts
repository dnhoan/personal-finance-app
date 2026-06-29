import { describe, expect, it } from "vitest";
import { formatRenewalMessage } from "@/server/cron/lib/format-renewal-message";

const base = { amount: 250_000, nextDue: "2026-07-02" } as const;

describe("formatRenewalMessage", () => {
  it("falls back to the category name when there is no note", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: null, categoryName: "Tiền nhà" },
      3,
    );
    expect(subject).toBe("Bill due in 3 days: Tiền nhà");
    expect(html).toContain("<h2>Bill due in 3 days</h2>");
    expect(html).toContain("Tiền nhà");
    expect(html).toContain("250.000");
    // next_due "2026-07-02" → DD/MM/YYYY by string-split (no UTC drift).
    expect(html).toContain("02/07/2026");
  });

  it("uses the note when present", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "Netflix", categoryName: "Giải trí" },
      1,
    );
    expect(subject).toBe("Bill due in 1 day: Netflix");
    expect(html).toContain("Netflix");
    expect(html).not.toContain("Giải trí");
  });

  it("escapes HTML-injection attempts in both subject and body", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "<script>alert(1)</script>", categoryName: null },
      2,
    );
    expect(subject).toContain("&lt;script&gt;");
    expect(subject).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
