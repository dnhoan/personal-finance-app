import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { TxDetail, TxLedgerItem, TxListItem } from "../queries";

export type TxEditAccountOption = { id: string; name: string; type: TxListItem["accountType"] };

// Everything the edit sheet picks from, bundled so list surfaces thread one prop
// instead of two down the row tree.
export type TxEditOptions = {
  accounts: TxEditAccountOption[];
  categories: CategoryPickerOption[];
};

// The edit sheet's view of a row, independent of which query produced it.
export type EditableTx = {
  id: string;
  kind: "income" | "expense" | "transfer";
  /** Magnitude — transfer sign lives in `isOutLeg`. */
  amount: number;
  accountId: string;
  accountName: string;
  accountType: TxListItem["accountType"];
  /** Transfer counterpart's account (null for income/expense). */
  mateAccountId: string | null;
  mateAccountName: string | null;
  /** Transfer only: this row is the source (stored negative). */
  isOutLeg: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  goalId: string | null;
  note: string | null;
  merchant: string | null;
  source: "manual" | "bank_sync";
};

/**
 * Maps a ledger row or a detail read onto the sheet's shape. Returns null for a
 * transfer whose counterpart can't be resolved (broken pair) — the caller hides
 * Edit for it, since there is no "other side" to prefill or update.
 */
export function toEditableTx(tx: TxLedgerItem | TxDetail): EditableTx | null {
  const mate =
    "transferMateAccountId" in tx
      ? { id: tx.transferMateAccountId, name: tx.transferMateAccountName }
      : { id: tx.transfer?.mateAccountId ?? null, name: tx.transfer?.mateAccountName ?? null };

  if (tx.kind === "transfer" && !mate.id) return null;

  return {
    id: tx.id,
    kind: tx.kind,
    amount: Math.abs(tx.amount),
    accountId: tx.accountId,
    accountName: tx.accountName,
    accountType: tx.accountType,
    mateAccountId: tx.kind === "transfer" ? mate.id : null,
    mateAccountName: tx.kind === "transfer" ? mate.name : null,
    isOutLeg: tx.kind === "transfer" && tx.amount < 0,
    categoryId: tx.categoryId,
    categoryName: tx.categoryName,
    categoryIcon: tx.categoryIcon,
    categoryColor: tx.categoryColor,
    goalId: tx.goalId,
    note: tx.note,
    merchant: tx.merchant,
    source: tx.source,
  };
}
