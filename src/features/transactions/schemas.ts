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

// Edit payload, discriminated on the TARGET kind. The server compares it with the
// row's current (locked) kind to pick one of four transitions: income<->expense,
// income/expense -> transfer, transfer -> income/expense, transfer -> transfer.
// `occurredAt` is deliberately not editable (the row keeps its timestamp).
// `merchant` omitted = keep the stored value; "" = clear it. No clientOpId:
// edits are not retried. Members stay plain ZodObjects (discriminatedUnion
// rejects refined members) — the cross-field check lives on the union.
const updateBase = {
  id: uuid,
  amount,
  note: z.string().trim().max(500).optional().or(z.literal("")),
  merchant: z.string().trim().max(200).optional(),
};
const updateIncomeTx = z.object({
  ...updateBase,
  kind: z.literal("income"),
  accountId: uuid,
  categoryId: uuid.nullish(),
});
const updateExpenseTx = z.object({
  ...updateBase,
  kind: z.literal("expense"),
  accountId: uuid,
  categoryId: uuid.nullish(),
});
const updateTransferTx = z.object({
  ...updateBase,
  kind: z.literal("transfer"),
  fromAccountId: uuid,
  toAccountId: uuid,
});

export const updateTxSchema = z
  .discriminatedUnion("kind", [updateIncomeTx, updateExpenseTx, updateTransferTx])
  .superRefine((v, ctx) => {
    if (v.kind === "transfer" && v.fromAccountId === v.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "Tài khoản nguồn và đích phải khác nhau",
      });
    }
  });
export type UpdateTxInput = z.input<typeof updateTxSchema>;
export type UpdateTxData = z.output<typeof updateTxSchema>;

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
