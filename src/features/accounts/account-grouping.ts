import type { AccountWithBalance } from "./queries";

export type AccountGroup = {
  rows: AccountWithBalance[];
  /** Sum of the group's balances (whole VND). */
  subtotal: number;
};

export type GroupedAccounts = {
  /** Net worth: assets (incl. receivables to collect) minus outstanding debts. */
  total: number;
  /** Spendable + receivable accounts: cash / bank / credit_card / e_wallet / receivable. */
  assets: AccountGroup;
  /** Debt accounts only; subtotal is the (negative) net-worth contribution. */
  liabilities: AccountGroup;
  /** Archived accounts, excluded from total/subtotals; rendered separately. */
  archived: AccountWithBalance[];
};

// Pure presentational grouping over already-authorized rows. Assets vs
// Liabilities is split strictly by `type === "debt"`, NOT by balance sign — a
// credit card can carry a negative balance yet still belongs under Assets, and a
// receivable (money owed to you) is an asset.
//
// Debt `balance` is the positive amount still owed (see listAccountsWithBalance),
// so it contributes NEGATIVELY to net worth: the liabilities subtotal and `total`
// subtract it. Archived accounts are pulled aside and excluded from every total.
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
  // Debt balances are amounts owed; they reduce net worth.
  const liabilitiesSubtotal = -sum(liabilities);

  return {
    total: assetsSubtotal + liabilitiesSubtotal,
    assets: { rows: assets, subtotal: assetsSubtotal },
    liabilities: { rows: liabilities, subtotal: liabilitiesSubtotal },
    archived,
  };
}
