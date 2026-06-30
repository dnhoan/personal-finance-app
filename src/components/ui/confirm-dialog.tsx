"use client";
import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// In-app confirmation built on the bottom-sheet primitive. Replaces
// window.confirm(), which iOS Safari suppresses in installed-PWA (standalone)
// mode — there the native dialog never shows and the action silently no-ops.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title}>
        {description ? <p className="mb-6 text-sm text-fg-muted">{description}</p> : null}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            className={cn(
              "flex-1",
              destructive && "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
            )}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
