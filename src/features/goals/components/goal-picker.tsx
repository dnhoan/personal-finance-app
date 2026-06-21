"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type GoalPickerOption = { id: string; name: string };

// Optional goal select for the quick-add sheet. `value=null` is the explicit
// "no goal" choice (tagging a goal is always optional).
export function GoalPicker({
  goals,
  value,
  onChange,
}: {
  goals: GoalPickerOption[];
  value: string | null;
  onChange: (goalId: string | null) => void;
}) {
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Không gắn mục tiêu" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Không gắn mục tiêu</SelectItem>
        {goals.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
