import { requireSession } from "@/lib/auth-session";
import { listAccountsWithBalance } from "@/features/accounts/queries";
import { AccountList } from "@/features/accounts/components/account-list";

export const metadata = { title: "Tài khoản · Personal Finance" };

export default async function AccountsPage() {
  const { user } = await requireSession();
  const accounts = await listAccountsWithBalance(user.id);

  return <AccountList accounts={accounts} />;
}
