import { z } from "zod";

// Bank names come from SePay's payload and their roster changes over time, so
// this is free text rather than an enum — a new bank must not require a
// migration. Matching is case-insensitive, done on the normalised value.
export const GATEWAY_MAX = 60;

// Long enough for any Vietnamese account number, short enough to bound what an
// authenticated user can store.
export const ACCOUNT_NUMBER_MAX = 32;

// The account number is the mapping key against SePay's payload, so it is
// normalised before it is stored or compared: humans type these with spaces and
// dashes, and "0123 456 789" must match "0123456789" or every delivery lands in
// the unmatched pile.
export function normaliseAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function normaliseGateway(raw: string): string {
  return raw.trim();
}

// Keyed on (gateway, accountNumber): re-submitting the same pair re-points it at
// a different internal account. Correcting a mistyped NUMBER therefore adds a new
// link rather than editing the old one — the stale row matches no traffic, and
// the UI offers delete for it.
export const upsertBankLinkSchema = z.object({
  accountId: z.string().uuid(),
  gateway: z
    .string()
    .transform(normaliseGateway)
    .pipe(z.string().min(1, "Chọn hoặc nhập tên ngân hàng").max(GATEWAY_MAX)),
  accountNumber: z
    .string()
    .transform(normaliseAccountNumber)
    .pipe(
      z
        .string()
        .min(4, "Số tài khoản quá ngắn")
        .max(ACCOUNT_NUMBER_MAX)
        .regex(/^[0-9]+$/, "Số tài khoản chỉ gồm chữ số"),
    ),
});
export type UpsertBankLinkInput = z.input<typeof upsertBankLinkSchema>;

export const deleteBankLinkSchema = z.object({ id: z.string().uuid() });
