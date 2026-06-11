"use client";
import * as React from "react";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutWithCacheClear } from "@/lib/auth-client";

export function SignOutMenuItem() {
  const [pending, setPending] = React.useState(false);

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={(e) => {
        e.preventDefault();
        setPending(true);
        void signOutWithCacheClear();
      }}
      className="text-danger focus:text-danger"
    >
      <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </DropdownMenuItem>
  );
}
