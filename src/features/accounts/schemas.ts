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

// Edit an existing account: name and current balance are mutable; type is not.
// `currentBalance` is the desired displayed balance; the action back-solves the
// stored opening balance so the derived balance (opening + transactions) matches.
export const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Tên tài khoản bắt buộc").max(80),
  currentBalance: z.number().int().min(0).max(MAX_VND),
});

export const archiveAccountSchema = z.object({ id: z.string().uuid() });
export const unarchiveAccountSchema = z.object({ id: z.string().uuid() });
export const setDefaultAccountSchema = z.object({ id: z.string().uuid() });
