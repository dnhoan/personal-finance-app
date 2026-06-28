import { describe, expect, it } from "vitest";
import { cronHealth } from "@/features/dashboard/lib/cron-health";

const NOW = new Date("2026-06-15T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe("cronHealth", () => {
  it("reports 'never' with no label when the heartbeat is null", () => {
    expect(cronHealth(null, NOW)).toEqual({ state: "never", relative: "" });
  });

  it("is ok within the 25h staleness window", () => {
    expect(cronHealth(hoursAgo(4), NOW)).toEqual({ state: "ok", relative: "4 giờ trước" });
    expect(cronHealth(hoursAgo(24), NOW).state).toBe("ok");
  });

  it("flags stale past 25h", () => {
    expect(cronHealth(hoursAgo(26), NOW).state).toBe("stale");
    expect(cronHealth(hoursAgo(48), NOW)).toEqual({ state: "stale", relative: "2 ngày trước" });
  });

  it("formats sub-hour and minute relatives in Vietnamese", () => {
    expect(cronHealth(new Date(NOW.getTime() - 30_000), NOW).relative).toBe("vừa xong");
    expect(cronHealth(new Date(NOW.getTime() - 5 * 60_000), NOW).relative).toBe("5 phút trước");
  });
});
