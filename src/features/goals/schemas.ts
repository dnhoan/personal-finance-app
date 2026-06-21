import { z } from "zod";
import { MAX_VND } from "@/features/transactions/schemas";

// target_date is an optional calendar date "YYYY-MM-DD"; null/empty means open-ended.
const targetDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
  .nullish()
  .or(z.literal(""));

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Tên mục tiêu bắt buộc").max(80),
  targetAmount: z.number().int().positive("Số tiền mục tiêu phải lớn hơn 0").max(MAX_VND),
  targetDate,
  // Informational link to an account (the bucket lives there); optional.
  accountId: z.string().uuid().nullish().or(z.literal("")),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.extend({
  id: z.string().uuid(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// Archive is a toggle: pass archived=true to hide, false to restore.
export const archiveGoalSchema = z.object({
  id: z.string().uuid(),
  archived: z.boolean(),
});
