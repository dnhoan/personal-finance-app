import { requireSession } from "@/lib/auth-session";
import { listCategoryTree, totalExpenseForMonth } from "@/features/categories/queries";
import { CategoryTree } from "@/features/categories/components/category-tree";
import { currentIctMonth } from "@/lib/month";

export const metadata = { title: "Danh mục · Personal Finance" };

export default async function CategoriesPage() {
  const { user } = await requireSession();
  const month = currentIctMonth();

  const [expenseTree, incomeTree, totalExpense] = await Promise.all([
    listCategoryTree(user.id, "expense", month),
    listCategoryTree(user.id, "income", month),
    totalExpenseForMonth(user.id, month),
  ]);

  return (
    <CategoryTree expenseTree={expenseTree} incomeTree={incomeTree} totalExpense={totalExpense} />
  );
}
