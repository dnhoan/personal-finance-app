"use client";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toIctDateInput } from "@/lib/locale";
import {
  buildRruleString,
  parseRruleString,
  defaultBuilderState,
  isValidRrule,
  nextOccurrences,
  anchorToVnDate,
  type RecurrenceFreq,
  type RruleBuilderState,
} from "../lib/rrule-builder";

const FREQS: { value: RecurrenceFreq; label: string; unit: string }[] = [
  { value: "DAILY", label: "Ngày", unit: "ngày" },
  { value: "WEEKLY", label: "Tuần", unit: "tuần" },
  { value: "MONTHLY", label: "Tháng", unit: "tháng" },
  { value: "YEARLY", label: "Năm", unit: "năm" },
];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]; // ISO Mon=0..Sun=6

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

// Recurrence pattern editor: preset chips (daily/weekly/monthly/yearly) with
// interval + day controls, or an expert raw-RRULE escape hatch. Owns the builder
// state and emits the final RRULE string via onChange (parent persists it).
export function RruleBuilderFields({
  initialRrule,
  onChange,
}: {
  initialRrule?: string;
  onChange: (rrule: string) => void;
}) {
  const [expert, setExpert] = React.useState(
    () => initialRrule != null && parseRruleString(initialRrule) === null,
  );
  const [raw, setRaw] = React.useState(() => initialRrule ?? "");
  const [state, setState] = React.useState<RruleBuilderState>(() => {
    if (initialRrule) {
      const parsed = parseRruleString(initialRrule);
      if (parsed) return parsed;
    }
    return defaultBuilderState(toIctDateInput(new Date()));
  });

  const builderRrule = React.useMemo(() => {
    try {
      return buildRruleString(state);
    } catch {
      return "";
    }
  }, [state]);

  const effective = expert ? raw.trim() : builderRrule;

  React.useEffect(() => {
    onChange(effective);
  }, [effective, onChange]);

  const preview = React.useMemo(() => {
    if (!effective || !isValidRrule(effective)) return [];
    try {
      return nextOccurrences(effective, 3).map((d) => fmtYmd(anchorToVnDate(d)));
    } catch {
      return [];
    }
  }, [effective]);

  const freq = FREQS.find((f) => f.value === state.freq) ?? FREQS[2]!;
  const set = (patch: Partial<RruleBuilderState>) => setState((s) => ({ ...s, ...patch }));

  const toggleWeekday = (w: number) =>
    set({
      byWeekday: state.byWeekday.includes(w)
        ? state.byWeekday.filter((x) => x !== w)
        : [...state.byWeekday, w],
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Lặp lại</Label>
        <button
          type="button"
          onClick={() => setExpert((v) => !v)}
          className="text-[13px] font-medium text-primary"
        >
          {expert ? "Cơ bản" : "Nâng cao"}
        </button>
      </div>

      {expert ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={"DTSTART:20260601T120000Z\nRRULE:FREQ=MONTHLY;BYMONTHDAY=1"}
            aria-label="Chuỗi RRULE"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-[12px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[12px] text-fg-subtle">Nhập chuỗi RFC 5545 (RRULE).</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 rounded-md bg-surface-muted p-1">
            {FREQS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={state.freq === f.value}
                onClick={() => set({ freq: f.value })}
                className={cn(
                  "min-h-[40px] rounded-sm text-sm font-medium transition-colors",
                  state.freq === f.value
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">Mỗi</span>
            <Input
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={state.interval}
              onChange={(e) => set({ interval: Math.max(1, Number(e.target.value) || 1) })}
              aria-label="Khoảng lặp"
              className="w-20"
            />
            <span className="text-sm text-fg-muted">{freq.unit}</span>
          </div>

          {state.freq === "WEEKLY" && (
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((label, w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={state.byWeekday.includes(w)}
                  onClick={() => toggleWeekday(w)}
                  className={cn(
                    "min-h-[36px] min-w-[40px] rounded-full border px-2 text-[13px] font-medium transition-colors",
                    state.byWeekday.includes(w)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-fg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {state.freq === "MONTHLY" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">Ngày trong tháng</span>
              <Input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={state.byMonthDay ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  set({ byMonthDay: n >= 1 && n <= 31 ? n : null });
                }}
                aria-label="Ngày trong tháng"
                className="w-20"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-start">Bắt đầu từ</Label>
            <Input
              id="rule-start"
              type="date"
              value={state.startDate}
              onChange={(e) => e.target.value && set({ startDate: e.target.value })}
            />
          </div>
        </>
      )}

      <p className="text-[12px] text-fg-subtle">
        {preview.length > 0 ? `Lịch kế tiếp: ${preview.join(" · ")}` : "Chưa có lịch hợp lệ"}
      </p>
    </div>
  );
}
