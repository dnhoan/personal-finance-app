import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cronHealth } from "../lib/cron-health";

// Dashboard footer badge reading the renewal-alert heartbeat. Healthy → muted
// "đã kiểm tra X trước"; stale/never → red warning so a silently-failed external
// cron is visible to the user. Server component — pure presentation.
export function CronStatusBadge({ lastCheckedAt }: { lastCheckedAt: Date | null }) {
  const health = cronHealth(lastCheckedAt);

  if (health.state === "ok") {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-fg-subtle">
        <ShieldCheck size={14} aria-hidden="true" />
        Kiểm tra nhắc nhở: {health.relative}
      </p>
    );
  }

  return (
    <p
      role="status"
      className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-danger"
    >
      <ShieldAlert size={14} aria-hidden="true" />
      {health.state === "never"
        ? "Nhắc nhở chưa từng chạy — kiểm tra cấu hình cron-job.org"
        : "Nhắc nhở có thể đã ngừng — kiểm tra cấu hình cron-job.org"}
    </p>
  );
}
