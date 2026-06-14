import { z } from "zod";
import { MAX_VND } from "@/features/transactions/schemas";
import { isValidRrule } from "./lib/rrule-builder";

const uuid = z.string().uuid();

const amount = z
  .number({ invalid_type_error: "Số tiền không hợp lệ" })
  .int()
  .positive("Số tiền phải lớn hơn 0")
  .max(MAX_VND, "Số tiền quá lớn");

// The form builds the final RRULE string client-side via the shared builder; the
// server re-validates it (parse + length cap) before persisting. 500-char cap
// bounds parse cost (DoS guard).
const rrule = z
  .string()
  .min(1, "Thiếu quy tắc lặp")
  .max(500, "Quy tắc lặp quá dài")
  .refine(isValidRrule, "Quy tắc lặp không hợp lệ");

const ruleFields = {
  accountId: uuid,
  categoryId: uuid.nullish(),
  kind: z.enum(["income", "expense"]),
  amount,
  note: z.string().trim().max(500).optional().or(z.literal("")),
  rrule,
  leadDays: z.number().int().min(0, "Không hợp lệ").max(30, "Tối đa 30 ngày"),
};

export const createRuleSchema = z.object(ruleFields);
export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = z.object({ id: uuid, ...ruleFields });
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

export const deleteRuleSchema = z.object({ id: uuid });

export const pauseRuleSchema = z.object({ id: uuid, active: z.boolean() });

// "This instance only": detach a single materialised transaction from its rule.
export const detachInstanceSchema = z.object({ transactionId: uuid });
