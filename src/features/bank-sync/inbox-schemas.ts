import { z } from "zod";

// Caps one bulk statement. Large enough for any realistic review session, small
// enough that the generated `id = ANY($ids)` stays sane.
export const BULK_MAX = 100;

const uuid = z.string().uuid();

export const confirmTransactionSchema = z.object({
  id: uuid,
  categoryId: uuid,
  accountId: uuid.optional(),
  note: z.string().trim().max(500).optional(),
});
export type ConfirmTransactionInput = z.infer<typeof confirmTransactionSchema>;

export const confirmManySchema = z.object({
  ids: z.array(uuid).min(1).max(BULK_MAX),
  categoryId: uuid,
});
export type ConfirmManyInput = z.infer<typeof confirmManySchema>;

export const undoBulkConfirmSchema = z.object({
  ids: z.array(uuid).min(1).max(BULK_MAX),
});

export const mergeAsTransferSchema = z.object({
  inId: uuid,
  outId: uuid,
});
export type MergeAsTransferInput = z.infer<typeof mergeAsTransferSchema>;

// Two legs of one internal transfer land as separate webhooks; they may be
// timestamped slightly apart, but not days apart. Beyond this window a same-amount
// coincidence is likelier than a real pair.
export const MERGE_MAX_DAY_GAP = 3;
