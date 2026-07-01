"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { X } from "lucide-react";
import { toIctDateInput } from "@/lib/locale";
import { randomUuid } from "@/lib/uuid";
import { KindToggle } from "../kind-toggle";
import { createTransaction, createTransfer } from "../../actions";
import {
  seedCategory,
  occurredAtFromInput,
  type DefaultCategoryByKind,
  type AccountOption,
} from "../../lib/quick-add-form";
import type { CategoryPickerOption } from "@/features/categories/components/category-picker";
import type { GoalPickerOption } from "@/features/goals/components/goal-picker";
import type { AddFormValues } from "./add-form-values";
import { AmountReadout } from "./amount-readout";
import { ContextFields } from "./context-fields";
import { AmountKeypad } from "./amount-keypad";

export type AddTransactionScreenProps = {
  accounts: AccountOption[];
  categories: CategoryPickerOption[];
  goals: GoalPickerOption[];
  defaultAccountId?: string;
  defaultCategoryByKind?: DefaultCategoryByKind;
};

// Each submit carries its own idempotency key so a retry (same key) never
// double-posts server-side. Built once per payload, reused by the retry toast.
type WritePayload = AddFormValues & { clientOpId: string };

// Dedicated full-screen transaction capture. Amount-first: the keypad drives the
// hero readout; Save writes optimistically in a transition, clears the amount for
// the next entry immediately (no wait), and a failed write offers a retry toast.
export function AddTransactionScreen({
  accounts,
  categories,
  goals,
  defaultAccountId,
  defaultCategoryByKind,
}: AddTransactionScreenProps) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  const { control, watch, setValue, getValues, reset } = useForm<AddFormValues>({
    defaultValues: {
      kind: "expense",
      amount: 0,
      accountId: defaultAccountId ?? "",
      toAccountId: "",
      categoryId: seedCategory(defaultCategoryByKind, "expense"),
      goalId: null,
      occurredAt: toIctDateInput(new Date()),
      note: "",
    },
  });

  const kind = watch("kind");
  const amount = watch("amount");

  // Fire-and-forget write inside a transition. Idempotent on clientOpId, so the
  // retry action can re-send the exact same payload without risking a duplicate.
  const write = React.useCallback(
    (payload: WritePayload) => {
      startTransition(async () => {
        const occurredAt = occurredAtFromInput(payload.occurredAt);
        try {
          if (payload.kind === "transfer") {
            await createTransfer({
              fromAccountId: payload.accountId,
              toAccountId: payload.toAccountId,
              amount: payload.amount,
              occurredAt,
              note: payload.note,
              clientOpId: payload.clientOpId,
            });
          } else {
            await createTransaction({
              kind: payload.kind,
              amount: payload.amount,
              accountId: payload.accountId,
              categoryId: payload.categoryId,
              goalId: payload.goalId,
              occurredAt,
              note: payload.note,
              clientOpId: payload.clientOpId,
            });
          }
          toast.success("Đã lưu");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Chưa lưu được", {
            action: { label: "Thử lại", onClick: () => write(payload) },
          });
        }
      });
    },
    [startTransition],
  );

  function handleSave() {
    const values = getValues();
    if (values.amount <= 0) return toast.error("Nhập số tiền hợp lệ");
    if (!values.accountId) return toast.error("Chọn tài khoản");
    if (values.kind === "transfer") {
      if (!values.toAccountId) return toast.error("Chọn tài khoản đích");
      if (values.accountId === values.toAccountId)
        return toast.error("Tài khoản nguồn và đích phải khác nhau");
    }

    write({ ...values, clientOpId: randomUuid() });

    // Optimistic: clear the amount for the next entry immediately, keeping kind +
    // account context. revalidateTxViews (server-side in the action) refreshes lists.
    reset({
      kind: values.kind,
      amount: 0,
      accountId: values.accountId,
      toAccountId: values.toAccountId,
      categoryId: seedCategory(defaultCategoryByKind, values.kind),
      goalId: null,
      occurredAt: toIctDateInput(new Date()),
      note: "",
    });
  }

  // The (app) layout pads <main> with a safe-area top inset + pb-24 (bottom-nav
  // clearance). The nav is hidden on /add, so cancel that vertical padding and
  // re-add a small safe-area top pad — the screen is then exactly one viewport
  // tall and the mt-auto keypad pins to the bottom without pushing Save off-screen.
  const fillViewport =
    "min-h-[100dvh] -mt-[max(1rem,env(safe-area-inset-top))] -mb-24 pt-[max(0.5rem,env(safe-area-inset-top))] md:-mb-8";

  if (accounts.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 text-center ${fillViewport}`}
      >
        <p className="text-fg-muted">Bạn cần tạo tài khoản trước khi ghi giao dịch.</p>
        <button
          type="button"
          onClick={() => router.push("/accounts")}
          className="h-12 rounded-md bg-primary px-6 font-medium text-primary-foreground"
        >
          Tạo tài khoản
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${fillViewport}`}>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Đóng"
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-transform active:scale-95 active:text-fg motion-reduce:active:scale-100"
        >
          <X size={22} aria-hidden="true" />
        </button>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <div className="flex-1 px-2">
              <KindToggle
                value={field.value}
                onChange={(k) => {
                  field.onChange(k);
                  // Category options are kind-specific; re-seed to the new kind's
                  // default (null for transfer / when the kind has no default).
                  setValue("categoryId", seedCategory(defaultCategoryByKind, k));
                }}
              />
            </div>
          )}
        />
        {/* Spacer to balance the close button so the toggle stays centered. */}
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <AmountReadout kind={kind} amount={amount} />

      <ContextFields
        control={control}
        accounts={accounts}
        categories={categories}
        goals={goals}
        kind={kind}
      />

      <div className="mt-auto pt-2 pb-5">
        <AmountKeypad
          amount={amount}
          kind={kind}
          onAmountChange={(next) => setValue("amount", next)}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
