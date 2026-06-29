import { describe, expect, it } from "vitest";
import { formatRenewalMessage } from "@/server/cron/lib/format-renewal-message";

const base = { amount: 250_000, nextDue: "2026-07-02" } as const;
const APP_URL = "https://finance.example.com";

describe("formatRenewalMessage", () => {
  it("falls back to the category name when there is no note", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: null, categoryName: "Tiền nhà" },
      3,
      APP_URL,
    );
    expect(subject).toBe("Sắp đến hạn (còn 3 ngày): Tiền nhà");
    expect(html).toContain("Tiền nhà");
    expect(html).toContain("250.000");
    // next_due "2026-07-02" → DD/MM/YYYY by string-split (no UTC drift).
    expect(html).toContain("02/07/2026");
    // Branded chrome present.
    expect(html).toContain("Personal Finance");
    expect(html).toContain("Xem chi tiết");
    expect(html).toContain(APP_URL);
  });

  it("uses the note when present", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "Netflix", categoryName: "Giải trí" },
      3,
      APP_URL,
    );
    expect(subject).toBe("Sắp đến hạn (còn 3 ngày): Netflix");
    expect(html).toContain("Netflix");
    expect(html).not.toContain("Giải trí");
  });

  it("uses 'ngày mai' urgency copy when due in 1 day", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "Netflix", categoryName: null },
      1,
      APP_URL,
    );
    expect(subject).toBe("Sắp đến hạn (đến hạn ngày mai): Netflix");
    expect(html).toContain("Đến hạn ngày mai");
  });

  it("uses 'hôm nay' urgency copy when due today (0 days)", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "Netflix", categoryName: null },
      0,
      APP_URL,
    );
    expect(subject).toBe("Sắp đến hạn (đến hạn hôm nay): Netflix");
    expect(html).toContain("Đến hạn hôm nay");
  });

  it("escapes HTML-injection attempts in both subject and body", () => {
    const { subject, html } = formatRenewalMessage(
      { ...base, note: "<script>alert(1)</script>", categoryName: null },
      2,
      APP_URL,
    );
    expect(subject).toContain("&lt;script&gt;");
    expect(subject).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });
});
