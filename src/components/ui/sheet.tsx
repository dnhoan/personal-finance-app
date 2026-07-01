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

// Tracks how much the on-screen keyboard overlaps the bottom of the layout
// viewport. A bottom-anchored fixed sheet is positioned against the *layout*
// viewport, which iOS Safari does not shrink when the keyboard opens — so
// without this the keyboard hides the sheet's bottom and Safari scroll-shifts
// the whole sheet, leaving it displaced after dismiss. Lifting `bottom` by the
// overlap keeps the sheet (and focused field) above the keyboard and resets to
// 0 on close. No-op where VisualViewport is unavailable.
function useKeyboardOverlap() {
  const [overlap, setOverlap] = React.useState(0);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setOverlap(Math.max(0, Math.round(covered)));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return overlap;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title?: string }
>(({ className, children, title, style, ...props }, ref) => {
  const keyboardOverlap = useKeyboardOverlap();
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] w-full max-w-lg flex-col",
          "rounded-t-[--radius-lg] border border-border bg-surface p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "shadow-[0_16px_40px_rgba(27,29,35,0.12)] focus:outline-none",
          "duration-300 ease-[cubic-bezier(0,0,0,1)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          "motion-reduce:data-[state=open]:fade-in-0 motion-reduce:data-[state=closed]:fade-out-0",
          "motion-reduce:duration-100",
          className,
        )}
        style={{
          ...style,
          // Float above the keyboard and cap to the still-visible area so the
          // sheet always fits; both revert to their CSS defaults at overlap 0.
          ...(keyboardOverlap > 0
            ? {
                bottom: keyboardOverlap,
                maxHeight: `calc(90vh - ${keyboardOverlap}px)`,
              }
            : null),
        }}
        {...props}
      >
        {/* Drag handle (decorative). */}
        <div className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-border" aria-hidden="true" />
        {title ? (
          <DialogPrimitive.Title
            className="mb-4 text-lg font-semibold text-fg px-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {title}
          </DialogPrimitive.Title>
        ) : (
          <DialogPrimitive.Title className="sr-only">Bảng thao tác</DialogPrimitive.Title>
        )}
        <div data-sheet-scroll="" className="flex-1 overflow-y-auto overscroll-contain px-2">
          {children}
        </div>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
