import { z } from "zod";
import { MAX_VND } from "@/features/transactions/schemas";

export const ACCOUNT_TYPES = [
  "cash",
  "bank",
  "credit_card",
  "e_wallet",
  "debt",
  "receivable",
] as const;

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Tên tài khoản bắt buộc").max(80),
  type: z.enum(ACCOUNT_TYPES),
  // Opening balance — whole VND, may be 0; never negative on input.
  initialBalance: z.number().int().min(0).max(MAX_VND),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const renameAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Tên tài khoản bắt buộc").max(80),
});

export const archiveAccountSchema = z.object({ id: z.string().uuid() });
