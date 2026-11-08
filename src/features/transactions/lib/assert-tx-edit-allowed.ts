import { and, eq, inArray } from "drizzle-orm";
import { accounts, bankLinks, bankSyncEvents, categories } from "@/lib/db/schema";
import type { DbExecutor } from "../repository";
import type { LockedTx } from "../repository-kind-transition";
import { TxEditRejection } from "./tx-edit-rejection";

// Guards for editing a transaction, run inside the edit's transaction against the
// rows it has already locked. Every id the client sends is checked here:
//  - ownership (cross-tenant IDOR — the FKs reference accounts/categories by id
//    alone, see assert-tx-refs-owned.ts);
//  - archived accounts/categories are refused unless the row already uses them,
//    so an edit can never silently move a row onto something the user retired;
//  - debt/receivable accounts: their balance counts only expense (debt) / income
//    (receivable) rows and ignores transfers, so a kind change there would
//    silently move the balance. A transfer that already touches one may still
//    have its amount/note edited as long as neither account changes;
//  - bank-backed legs keep their account and are never deleted, and no manual
//    leg may land on a bank-linked account next to one (the feed would import
//    the same money again).

type Branch = "single" | "toTransfer" | "toSingle" | "transfer";

export type EditGuardInput = {
  branch: Branch;
  r: LockedTx;
  m: LockedTx | null;
  /** Account R ends up on after the edit. */
  rAccountId: string;
  /** Account M ends up on (transfer results only). */
  mAccountId: string | null;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer";
};

const DEBT_TYPES = new Set(["debt", "receivable"]);
const SYNCED_ACCOUNT_LOCKED = "Giao dịch đồng bộ ngân hàng không thể đổi tài khoản";

export async function assertTxEditAllowed(
  tx: DbExecutor,
  userId: string,
  g: EditGuardInput,
): Promise<void> {
  const { branch, r, m } = g;
  const currentAccountIds = new Set([r.accountId, m?.accountId].filter(Boolean) as string[]);
  const newAccountIds = [g.rAccountId, g.mAccountId].filter(Boolean) as string[];

  const rows = await tx
    .select({ id: accounts.id, type: accounts.type, status: accounts.status })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(accounts.id, [...new Set([...newAccountIds, ...currentAccountIds])]),
      ),
    );
  const byId = new Map(rows.map((a) => [a.id, a]));

  for (const id of newAccountIds) {
    const acc = byId.get(id);
    if (!acc) throw new TxEditRejection("Tài khoản không tồn tại");
    if (acc.status === "archived" && !currentAccountIds.has(id)) {
      throw new TxEditRejection("Tài khoản đã lưu trữ — hãy chọn tài khoản khác");
    }
  }

  const accountsUnchanged = g.rAccountId === r.accountId && g.mAccountId === (m?.accountId ?? null);
  if (branch !== "single" && !(branch === "transfer" && accountsUnchanged)) {
    const involved = [...newAccountIds, ...currentAccountIds];
    if (involved.some((id) => DEBT_TYPES.has(byId.get(id)?.type ?? ""))) {
      throw new TxEditRejection(
        branch === "transfer"
          ? "Chuyển khoản với tài khoản nợ hoặc khoản cho vay chỉ sửa được số tiền và ghi chú"
          : "Không thể đổi loại giao dịch với tài khoản nợ hoặc khoản cho vay",
      );
    }
  }

  if (g.categoryId) await assertCategoryUsable(tx, userId, g.categoryId, g.kind, r.categoryId);

  if (branch === "single") return;
  await assertBankSyncSafe(tx, userId, g);
}

async function assertCategoryUsable(
  tx: DbExecutor,
  userId: string,
  categoryId: string,
  kind: EditGuardInput["kind"],
  currentCategoryId: string | null,
): Promise<void> {
  const [cat] = await tx
    .select({ kind: categories.kind, archivedAt: categories.archivedAt })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!cat) throw new TxEditRejection("Danh mục không tồn tại");
  if (cat.kind !== kind) throw new TxEditRejection("Danh mục không khớp loại thu/chi");
  if (cat.archivedAt && categoryId !== currentCategoryId) {
    throw new TxEditRejection("Danh mục đã lưu trữ — hãy chọn danh mục khác");
  }
}

async function assertBankSyncSafe(
  tx: DbExecutor,
  userId: string,
  g: EditGuardInput,
): Promise<void> {
  const { branch, r, m } = g;
  const legIds = [r.id, m?.id].filter(Boolean) as string[];
  const accountIds = [
    ...new Set([r.accountId, m?.accountId, g.rAccountId, g.mAccountId].filter(Boolean) as string[]),
  ];

  const [events, links] = await Promise.all([
    tx
      .select({ txId: bankSyncEvents.transactionId })
      .from(bankSyncEvents)
      .where(and(eq(bankSyncEvents.userId, userId), inArray(bankSyncEvents.transactionId, legIds))),
    tx
      .select({ accountId: bankLinks.accountId })
      .from(bankLinks)
      .where(and(eq(bankLinks.userId, userId), inArray(bankLinks.accountId, accountIds))),
  ]);
  const evented = new Set(events.map((e) => e.txId));
  const linked = new Set(links.map((l) => l.accountId));

  // A leg is bank-backed when the feed created it, or when the pair came from the
  // inbox merge — that writes both legs as manual and points every bank event at
  // the out-leg only, so provenance is read from the events plus whether this
  // leg's own account is bank-linked.
  const isBankBacked = (leg: LockedTx) =>
    leg.source === "bank_sync" ||
    evented.has(leg.id) ||
    (evented.size > 0 && linked.has(leg.accountId));
  const rBank = isBankBacked(r);
  const mBank = m ? isBankBacked(m) : false;

  // The bank statement says which account this money moved through; the ledger
  // row must stay on it or the balance drifts from the bank's.
  if (rBank && g.rAccountId !== r.accountId) throw new TxEditRejection(SYNCED_ACCOUNT_LOCKED);
  if (m && mBank && g.mAccountId !== null && g.mAccountId !== m.accountId) {
    throw new TxEditRejection(SYNCED_ACCOUNT_LOCKED);
  }

  // Converting to income/expense deletes M; a bank-backed M is a real statement
  // line and must survive.
  if (branch === "toSingle" && mBank) {
    throw new TxEditRejection("Phía còn lại là giao dịch đồng bộ ngân hàng — không thể xóa");
  }

  // A manual leg newly placed on a bank-linked account, opposite a bank-backed
  // leg, would be imported again by that account's feed (double count) — and the
  // inbox merge only pairs pending bank rows, so it could never be reconciled.
  const manualLegLandsOnLinked =
    (rBank &&
      g.mAccountId !== null &&
      g.mAccountId !== (m?.accountId ?? null) &&
      linked.has(g.mAccountId)) ||
    (mBank && g.rAccountId !== r.accountId && linked.has(g.rAccountId));
  if (manualLegLandsOnLinked) {
    throw new TxEditRejection(
      "Tài khoản đối ứng cũng đồng bộ ngân hàng — hãy dùng Ghép chuyển khoản trong Hộp thư",
    );
  }
}
