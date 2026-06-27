"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// Bottom-sheet built on Radix Dialog. Slides up with a slow decel entry; a
// drag-handle affordance sits at the top. Motion collapses to a quick fade
// under prefers-reduced-motion (motion-reduce variants).
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title?: string }
>(({ className, children, title, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] w-full max-w-lg flex-col",
        "rounded-t-[--radius-lg] border border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        "shadow-[0_16px_40px_rgba(27,29,35,0.12)] focus:outline-none",
        "duration-300 ease-[cubic-bezier(0,0,0,1)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        "motion-reduce:data-[state=open]:fade-in-0 motion-reduce:data-[state=closed]:fade-out-0",
        "motion-reduce:duration-100",
        className,
      )}
      {...props}
    >
      {/* Drag handle (decorative). */}
      <div className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-border" aria-hidden="true" />
      {title ? (
        <DialogPrimitive.Title
          className="mb-4 text-lg font-semibold text-fg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </DialogPrimitive.Title>
      ) : (
        <DialogPrimitive.Title className="sr-only">Bảng thao tác</DialogPrimitive.Title>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
