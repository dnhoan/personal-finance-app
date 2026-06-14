import { z } from "zod";
import { MAX_VND } from "@/features/transactions/schemas";

// period_month is always a month-start DATE string "YYYY-MM-01".
const periodMonth = z.string().regex(/^\d{4}-\d{2}-01$/, "Kỳ không hợp lệ");

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  periodMonth,
  amount: z.number().int().positive("Hạn mức phải lớn hơn 0").max(MAX_VND),
  rollover: z.boolean(),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const deleteBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  periodMonth,
});

export const copyFromLastMonthSchema = z.object({ periodMonth });
