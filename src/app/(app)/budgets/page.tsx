import { Target } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Ngân sách · Personal Finance" };

// Throwaway placeholder so the bottom-nav "Ngân sách" tab doesn't 404. Replaced
// by the real budgets surface in the MVP plan's budgets phase.
export default function BudgetsPage() {
  return <ComingSoon title="Ngân sách" subtitle="Tính năng đang được phát triển." icon={Target} />;
}
