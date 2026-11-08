import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { EditableTx, TxEditAccountOption } from "./to-editable-tx";

// Pure helpers behind TransactionEditSheet: initial field values, which side of
// a transfer the opened row sits on, and the option lists the selects show.

export type EditFormState = {
  kind: EditableTx["kind"];
  amount: number | null;
  /** Income/expense account. */
  accountId: string;
  categoryId: string | null;
  fromId: string;
  toId: string;
  note: string;
};

type Option = { id: string; name: string };

const ARCHIVED_SUFFIX = " (đã lưu trữ)";
// Their balances ignore transfers, so they never take part in a kind conversion
// (the server enforces the same rule).
const DEBT_TYPES = new Set<TxEditAccountOption["type"]>(["debt", "receivable"]);

/**
 * Which transfer side the opened row (R) occupies once it is a transfer: an
 * expense / negative leg is the source, an income / positive leg the target.
 * The server keeps R on this side, so the UI prefills and (for bank-synced
 * rows) locks this select.
 */
export function openedRowSide(tx: EditableTx): "from" | "to" {
  if (tx.kind === "transfer") return tx.isOutLeg ? "from" : "to";
  return tx.kind === "expense" ? "from" : "to";
}

export function initialEditState(tx: EditableTx): EditFormState {
  const side = openedRowSide(tx);
  const other = tx.kind === "transfer" ? (tx.mateAccountId ?? "") : "";
  return {
    kind: tx.kind,
    amount: tx.amount,
    accountId: tx.accountId,
    categoryId: tx.categoryId,
    fromId: side === "from" ? tx.accountId : other,
    toId: side === "to" ? tx.accountId : other,
    note: tx.note ?? "",
  };
}

/**
 * Account for the income/expense result of a transfer: the "natural" side —
 * Chi leaves from "Từ", Thu lands in "Đến". A bank-synced row never moves.
 */
export function naturalSingleAccount(
  tx: EditableTx,
  kind: "income" | "expense",
  s: Pick<EditFormState, "fromId" | "toId">,
): string {
  if (tx.source === "bank_sync") return tx.accountId;
  return (kind === "expense" ? s.fromId : s.toId) || tx.accountId;
}

/**
 * Account choices. Debt/receivable accounts are dropped whenever the edit
 * involves a transfer (target or source kind) — except the row's own accounts,
 * so an existing transfer on a debt account can still have its amount/note
 * edited. The row's own accounts also stay selectable when archived, so opening
 * the sheet never silently swaps them.
 */
export function editAccountOptions(
  tx: EditableTx,
  accounts: TxEditAccountOption[],
  involvesTransfer: boolean,
): Option[] {
  const own: [string | null, string | null][] = [
    [tx.accountId, tx.accountName],
    [tx.mateAccountId, tx.mateAccountName],
  ];
  const ownIds = new Set(own.map(([id]) => id));
  const list: Option[] = accounts
    .filter((a) => !involvesTransfer || !DEBT_TYPES.has(a.type) || ownIds.has(a.id))
    .map(({ id, name }) => ({ id, name }));
  for (const [id, name] of own) {
    if (id && name && !accounts.some((a) => a.id === id)) {
      list.push({ id, name: name + ARCHIVED_SUFFIX });
    }
  }
  return list;
}

/** Category choices plus the row's current category when it has been archived. */
export function editCategoryOptions(
  tx: EditableTx,
  categories: CategoryPickerOption[],
): CategoryPickerOption[] {
  if (tx.kind === "transfer" || !tx.categoryId || !tx.categoryName) return categories;
  if (categories.some((c) => c.id === tx.categoryId)) return categories;
  return [
    ...categories,
    {
      id: tx.categoryId,
      name: tx.categoryName + ARCHIVED_SUFFIX,
      kind: tx.kind,
      parentId: null,
      icon: tx.categoryIcon,
      color: tx.categoryColor,
    },
  ];
}

export function isDebtAccountType(type: TxEditAccountOption["type"]): boolean {
  return DEBT_TYPES.has(type);
}
