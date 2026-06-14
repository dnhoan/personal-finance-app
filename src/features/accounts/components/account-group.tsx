import type { Route } from "next";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/vnd";
import { cn } from "@/lib/utils";
import type { AccountWithBalance } from "../queries";
import { AccountRow } from "./account-row";

const MINUS = "−"; // U+2212, not a hyphen — per design guidelines.

// A titled account group (Assets / Liabilities): uppercase header + signed
// subtotal, then a Card of rows. `hrefFor` lets the orchestrator route debt rows
// differently from asset rows. `onEdit` opens the rename sheet for a given row.
export function AccountGroup({
  title,
  subtotal,
  rows,
  hrefFor,
  onEdit,
}: {
  title: string;
  subtotal: number;
  rows: AccountWithBalance[];
  hrefFor: (account: AccountWithBalance) => Route;
  onEdit: (account: AccountWithBalance) => void;
}) {
  if (rows.length === 0) return null;

  const negative = subtotal < 0;
  const subtotalText = `${negative ? MINUS : "+"} ${formatVnd(Math.abs(subtotal))}`;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{title}</p>
        <p
          className={cn(
            "text-xs font-medium tabular-nums",
            negative ? "text-expense" : "text-income",
          )}
        >
          {subtotalText}
        </p>
      </div>
      <Card className="divide-y divide-border p-0">
        {rows.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            href={hrefFor(account)}
            onEdit={() => onEdit(account)}
          />
        ))}
      </Card>
    </section>
  );
}
