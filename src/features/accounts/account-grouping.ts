import type { AccountWithBalance } from "./queries";

export type AccountGroup = {
  rows: AccountWithBalance[];
  /** Sum of the group's balances (whole VND). */
  subtotal: number;
};

export type GroupedAccounts = {
  /** Sum of all non-archived balances (assets + liabilities). */
  total: number;
  /** Non-debt accounts: cash / bank / credit_card / e_wallet. */
  assets: AccountGroup;
  /** Debt-type accounts only. */
  liabilities: AccountGroup;
  /** Archived accounts, excluded from total/subtotals; rendered separately. */
  archived: AccountWithBalance[];
};

// Pure presentational grouping over already-authorized rows. Assets vs
// Liabilities is split strictly by `type === "debt"`, NOT by balance sign — a
// credit card can carry a negative balance yet still belongs under Assets.
// Archived accounts are pulled aside and excluded from every total.
export function groupAccounts(accounts: AccountWithBalance[]): GroupedAccounts {
  const assets: AccountWithBalance[] = [];
  const liabilities: AccountWithBalance[] = [];
  const archived: AccountWithBalance[] = [];

  for (const account of accounts) {
    if (account.status === "archived") {
      archived.push(account);
    } else if (account.type === "debt") {
      liabilities.push(account);
    } else {
      assets.push(account);
    }
  }

  const sum = (rows: AccountWithBalance[]) => rows.reduce((acc, r) => acc + r.balance, 0);
  const assetsSubtotal = sum(assets);
  const liabilitiesSubtotal = sum(liabilities);

  return {
    total: assetsSubtotal + liabilitiesSubtotal,
    assets: { rows: assets, subtotal: assetsSubtotal },
    liabilities: { rows: liabilities, subtotal: liabilitiesSubtotal },
    archived,
  };
}
