"use client";
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/app-shell/back-link";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { DebtsView } from "../queries";
import { DebtRow } from "./debt-row";
import { ENTER, enterDelay } from "@/lib/enter-animation";

type Filter = "active" | "settled" | "all";

// Debts surface (wireframe 11): two-column summary + segmented filter + rows.
// Settled debts are hidden by default. Payments are recorded from the global FAB
// (an expense to the debt account / income to a receivable), so there is no
// inline payment form here — a hint points the user to it.
export function DebtList({ view }: { view: DebtsView }) {
  const [filter, setFilter] = React.useState<Filter>("active");

  const activeRows = view.rows.filter((d) => d.status !== "settled");
  const settledRows = view.rows.filter((d) => d.status === "settled");
  const visible = filter === "active" ? activeRows : filter === "settled" ? settledRows : view.rows;

  const segments: { key: Filter; label: string }[] = [
    { key: "active", label: `Đang hoạt động · ${activeRows.length}` },
    { key: "settled", label: "Đã thanh toán" },
    { key: "all", label: "Tất cả" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className={ENTER}>
        <PageHeader href="/settings" label="Nợ & Vay" />
      </div>

      <section
        className={`grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-5 ${ENTER}`}
        style={enterDelay(60)}
      >
        <div className="border-r border-border">
          <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Bạn đang nợ</p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums text-expense"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatVnd(view.summary.totalOwing)}
          </p>
          <p className="text-[12px] text-fg-muted">{view.summary.owingActive} đang hoạt động</p>
        </div>
        <div className="pl-3">
          <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Người nợ bạn</p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums text-income"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatVnd(view.summary.totalOwed)}
          </p>
          <p className="text-[12px] text-fg-muted">{view.summary.owedActive} đang hoạt động</p>
        </div>
      </section>

      <div
        className={`inline-flex gap-1 self-start rounded-full bg-surface-muted p-1 ${ENTER}`}
        style={enterDelay(120)}
      >
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
              filter === s.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {view.rows.length === 0 ? (
        <div
          className={`flex flex-col items-center gap-2 py-16 text-center ${ENTER}`}
          style={enterDelay(180)}
        >
          <HandCoins size={32} className="text-fg-subtle" aria-hidden="true" />
          <p className="text-fg-muted">Chưa có khoản nợ nào.</p>
          <p className="text-sm text-fg-subtle">
            Tạo tài khoản loại &quot;Khoản nợ&quot; hoặc &quot;Khoản phải thu&quot; từ trang{" "}
            <Link href={"/accounts" as Route} className="font-medium text-primary">
              Tài khoản
            </Link>
            .
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className={`py-10 text-center text-sm text-fg-subtle ${ENTER}`} style={enterDelay(180)}>
          Không có khoản nào.
        </p>
      ) : (
        <div className={`flex flex-col gap-4 ${ENTER}`} style={enterDelay(180)}>
          {visible.map((d) => (
            <DebtRow key={d.id} debt={d} />
          ))}
        </div>
      )}

      <p className={`text-center text-[12px] text-fg-subtle ${ENTER}`} style={enterDelay(240)}>
        Ghi nhận thanh toán bằng cách thêm một giao dịch vào tài khoản nợ tương ứng.
      </p>
    </div>
  );
}
