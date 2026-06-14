"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getCategoryIcon } from "../category-icons";

export type CategoryPickerOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  parentId: string | null;
  icon: string | null;
  color: string | null;
};

// Category select filtered by kind, rendered as roots with indented children.
// `value=null` is the explicit "no category" choice (category is optional on a tx).
export function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
}: {
  categories: CategoryPickerOption[];
  kind: "income" | "expense";
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const filtered = categories.filter((c) => c.kind === kind);
  const roots = filtered.filter((c) => c.parentId === null);
  const childrenByParent = new Map<string, CategoryPickerOption[]>();
  for (const c of filtered) {
    if (c.parentId === null) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }

  const renderItem = (c: CategoryPickerOption, child: boolean) => {
    const Icon = getCategoryIcon(c.icon);
    return (
      <SelectItem key={c.id} value={c.id} className={child ? "pl-10" : undefined}>
        <span className="flex items-center gap-2">
          <Icon size={16} style={c.color ? { color: c.color } : undefined} aria-hidden="true" />
          {c.name}
        </span>
      </SelectItem>
    );
  };

  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Chọn danh mục" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Không có danh mục</SelectItem>
        {roots.flatMap((root) => [
          renderItem(root, false),
          ...(childrenByParent.get(root.id) ?? []).map((child) => renderItem(child, true)),
        ])}
      </SelectContent>
    </Select>
  );
}
