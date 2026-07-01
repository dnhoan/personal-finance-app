import type { TxKind } from "../kind-toggle";

// Form shape for the /add capture screen. Shared by the screen (owns the RHF
// instance + submit) and the context-fields block (renders Controllers against it).
// `amount` is whole VND driven by the keypad; `occurredAt` is an ICT calendar date
// (`YYYY-MM-DD`) that the submit converts to a Date.
export type AddFormValues = {
  kind: TxKind;
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string | null;
  goalId: string | null;
  occurredAt: string;
  note: string;
};
