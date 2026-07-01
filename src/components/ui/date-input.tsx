"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateInputDisplay } from "@/lib/locale";

// A `<input type="date">` renders its value in the OS/browser locale (e.g.
// "30 Jun 2026" on iOS) and that display can't be reformatted via any attribute.
// So we hide the native value text and overlay our own DD/MM/YYYY string, while
// still using the native picker for input. The native field is revealed on
// focus (peer-focus) so desktop keyboard editing keeps working; on blur the
// formatted overlay returns. iOS also gives no way to clear a chosen date, so we
// add a clear (×) affordance on touch devices, which already lack a native one.
export function DateInput({
  value,
  onValueChange,
  clearable = true,
  clearLabel = "Xóa ngày",
  placeholder = "dd/mm/yyyy",
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  clearable?: boolean;
  clearLabel?: string;
}) {
  const display = value ? formatDateInputDisplay(value) : "";
  const showClear = clearable && Boolean(value);

  return (
    <div className="relative">
      <Input
        type="date"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "peer text-transparent focus:text-fg",
          showClear && "[@media(hover:none)]:pr-11",
          className,
        )}
        {...props}
      />
      {/* Formatted overlay, aligned to the field's own border+padding box so it
          sits exactly where the native value would. Hidden while the field is
          focused so the real control shows through for editing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center rounded-md border border-transparent px-3 text-base peer-focus:opacity-0"
      >
        <span className={display ? "text-fg" : "text-fg-subtle"}>{display || placeholder}</span>
      </div>
      {showClear && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={clearLabel}
          className="absolute right-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors active:bg-surface-muted active:text-fg [@media(hover:none)]:flex"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
