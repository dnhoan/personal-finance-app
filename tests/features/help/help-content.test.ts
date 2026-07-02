import { describe, expect, it } from "vitest";
import { HELP_SECTIONS, WELCOME_TIP_IDS } from "@/features/help/help-content";

// These invariants are the whole reason the section ids and the welcome subset
// live in one module: they keep the first-run teaser in sync with the full page.
describe("help-content", () => {
  it("has unique section ids", () => {
    const ids = HELP_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every WELCOME_TIP_IDS entry to a real section", () => {
    const ids = new Set(HELP_SECTIONS.map((s) => s.id));
    for (const id of WELCOME_TIP_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("gives every section a title, summary and at least one tip", () => {
    for (const section of HELP_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.tips.length).toBeGreaterThan(0);
    }
  });
});
