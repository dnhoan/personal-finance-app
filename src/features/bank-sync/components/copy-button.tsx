"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Copy-to-clipboard with a brief confirmed state. The Clipboard API needs a
// secure context, so a failure (plain http, or a browser that withholds
// permission) falls back to telling the user to copy by hand rather than
// silently doing nothing — this button carries values that cannot be re-read
// later, so a silent no-op would lose them.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error("Không copy được — hãy chọn và copy thủ công");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? `Đã copy ${label}` : `Copy ${label}`}
    >
      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
      {copied ? "Đã copy" : "Copy"}
    </Button>
  );
}
