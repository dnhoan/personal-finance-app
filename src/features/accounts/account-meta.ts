import {
  Coins,
  Landmark,
  CreditCard,
  Smartphone,
  HandCoins,
  ArrowDownLeft,
  type LucideIcon,
} from "lucide-react";
import type { ACCOUNT_TYPES } from "./schemas";

export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Vietnamese label + Lucide icon + semantic tint per account type (icons per
// design-guidelines.md). `tint` is the icon-tile bg+text pair, token-based so it
// resolves in both light and dark mode; it lets account lists and the type
// picker read by type at a glance instead of a wall of identical gray bubbles.
// `debt` = money you owe; `receivable` = money owed to you.
export const ACCOUNT_META: Record<AccountType, { label: string; icon: LucideIcon; tint: string }> =
  {
    cash: { label: "Tiền mặt", icon: Coins, tint: "bg-income-soft text-income" },
    bank: { label: "Ngân hàng", icon: Landmark, tint: "bg-primary/10 text-primary" },
    credit_card: { label: "Thẻ tín dụng", icon: CreditCard, tint: "bg-warning/15 text-warning" },
    e_wallet: { label: "Ví điện tử", icon: Smartphone, tint: "bg-accent/15 text-accent" },
    debt: { label: "Khoản nợ (bạn nợ)", icon: HandCoins, tint: "bg-expense-soft text-expense" },
    receivable: {
      label: "Khoản phải thu (nợ bạn)",
      icon: ArrowDownLeft,
      tint: "bg-income-soft text-income",
    },
  };
