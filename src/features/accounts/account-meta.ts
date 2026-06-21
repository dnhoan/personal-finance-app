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

// Vietnamese label + Lucide icon per account type (icons per design-guidelines.md).
// `debt` = money you owe; `receivable` = money owed to you.
export const ACCOUNT_META: Record<AccountType, { label: string; icon: LucideIcon }> = {
  cash: { label: "Tiền mặt", icon: Coins },
  bank: { label: "Ngân hàng", icon: Landmark },
  credit_card: { label: "Thẻ tín dụng", icon: CreditCard },
  e_wallet: { label: "Ví điện tử", icon: Smartphone },
  debt: { label: "Khoản nợ (bạn nợ)", icon: HandCoins },
  receivable: { label: "Khoản phải thu (nợ bạn)", icon: ArrowDownLeft },
};
