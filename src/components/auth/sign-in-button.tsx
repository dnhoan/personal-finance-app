"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth-client";

export function SignInButton({ from }: { from?: string }) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await signInWithGoogle(from);
    } catch {
      // signIn redirects on success; only reaches here on a network failure.
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      // White/outline Google button: white surface + hairline border + muted
      // hover, so the full-color G carries the brand while the button stays calm.
      className="w-full gap-2.5 bg-surface font-semibold text-fg hover:bg-surface-muted hover:text-fg"
      onClick={handleClick}
      disabled={pending}
    >
      <GoogleMark />
      {pending ? "Đang chuyển hướng…" : "Tiếp tục với Google"}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44a20 20 0 0 0 13.4-5.2L31 33.6a12 12 0 0 1-7 2.4c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 4-3.8 5.3l6.4 5A19.9 19.9 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
