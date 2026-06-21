import { z } from "zod";

// Shared client/server validation. Amounts are whole VND integers (the client
// parses shorthand via parseVnd before submit). Upper bound matches the parser.
export const MAX_VND = 999_999_999_999;

const amount = z
  .number({ invalid_type_error: "Số tiền không hợp lệ" })
  .int()
  .positive("Số tiền phải lớn hơn 0")
  .max(MAX_VND, "Số tiền quá lớn");

const uuid = z.string().uuid();

// Income / expense. `categoryId` optional (Phase 5 wires the picker); `clientOpId`
// is the per-submit idempotency key the client generates with crypto.randomUUID().
export const createTxSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount,
  accountId: uuid,
  categoryId: uuid.nullish(),
  // Optional manual goal tag — the user picks it in the quick-add sheet; it is
  // never auto-set. Progress is computed as SUM(amount) over tagged tx.
  goalId: uuid.nullish(),
  occurredAt: z.coerce.date(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  merchant: z.string().trim().max(200).optional().or(z.literal("")),
  clientOpId: uuid,
});
export type CreateTxInput = z.infer<typeof createTxSchema>;

// Editing is for income/expense rows only this round (transfer-pair edit is
// out of scope — delete + re-create instead). No clientOpId: edits are not retried.
export const updateTxSchema = z.object({
  id: uuid,
  kind: z.enum(["income", "expense"]),
  amount,
  accountId: uuid,
  categoryId: uuid.nullish(),
  occurredAt: z.coerce.date(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  merchant: z.string().trim().max(200).optional().or(z.literal("")),
});
export type UpdateTxInput = z.infer<typeof updateTxSchema>;

export const deleteTxSchema = z.object({ id: uuid });

// Transfer = two linked rows written atomically. One clientOpId keys the whole
// submit (carried on the out-row); the pair is mutually linked server-side.
export const transferSchema = z
  .object({
    fromAccountId: uuid,
    toAccountId: uuid,
    amount,
    occurredAt: z.coerce.date(),
    note: z.string().trim().max(500).optional().or(z.literal("")),
    clientOpId: uuid,
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Tài khoản nguồn và đích phải khác nhau",
    path: ["toAccountId"],
  });
export type TransferInput = z.infer<typeof transferSchema>;

// Transaction list filters. All optional; defaults applied in the query layer.
export const txFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  kind: z.enum(["income", "expense", "transfer"]).optional(),
  accountId: uuid.optional(),
  categoryId: uuid.optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type TxFilter = z.infer<typeof txFilterSchema>;
