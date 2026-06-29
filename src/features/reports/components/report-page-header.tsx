import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { ReportTabs, type ReportTab } from "./report-tabs";

// Shared shell for the three report pages: a compact back affordance to the
// dashboard, a Fraunces screen title (a real <h1> for document structure / SR),
// and the segmented ReportTabs. Consolidates the back-link + tabs that were
// previously copy-pasted into each page.
//
// This deliberately does NOT reuse the large BackLink component: that one is
// styled to *be* the page heading (its sub-pages drop their own <h1>), which
// conflicts with reports now carrying a dedicated Fraunces <h1>. A small chevron
// link gives the back path without stacking two oversized serif headings.
export function ReportPageHeader({ title, active }: { title: string; active: ReportTab }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={"/dashboard" as Route}
        className="-ml-1 flex w-fit items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> Báo cáo
      </Link>
      <h1
        className="text-[28px] font-semibold leading-tight text-fg"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {title}
      </h1>
      <ReportTabs active={active} />
    </div>
  );
}
