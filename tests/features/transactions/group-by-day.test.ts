import { describe, expect, it } from "vitest";
import { groupTransactionsByDay } from "@/features/transactions/lib/group-by-day";
import type { TxListItem } from "@/features/transactions/queries";

const NOW = new Date("2026-06-15T10:00:00Z"); // 2026-06-15 17:00 ICT

// Minimal row factory — only the fields grouping reads matter.
function tx(
  partial: Partial<TxListItem> & Pick<TxListItem, "kind" | "amount" | "occurredAt">,
): TxListItem {
  return {
    id: Math.random().toString(36).slice(2),
    note: null,
    merchant: null,
    accountId: "a",
    accountName: "Tiền mặt",
    accountType: "cash",
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    categoryIcon: null,
    transferPairId: null,
    recurringRuleId: null,
    ...partial,
  };
}

const at = (ymd: string) => new Date(`${ymd}T05:00:00Z`); // noon ICT on that date

describe("groupTransactionsByDay", () => {
  it("buckets by ICT day, preserving DESC order", () => {
    const groups = groupTransactionsByDay(
      [
        tx({ kind: "expense", amount: 65_000, occurredAt: at("2026-06-15") }),
        tx({ kind: "expense", amount: 120_000, occurredAt: at("2026-06-15") }),
        tx({ kind: "income", amount: 18_500_000, occurredAt: at("2026-06-14") }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-06-15", "2026-06-14"]);
    expect(groups[0]!.label).toBe("Hôm nay");
    expect(groups[1]!.label).toBe("Hôm qua");
    expect(groups[0]!.dateLabel).toBe("15/06/2026");
    expect(groups[0]!.items).toHaveLength(2);
  });

  it("subtotal = +income − expense, transfers excluded", () => {
    const [group] = groupTransactionsByDay(
      [
        tx({ kind: "income", amount: 1_000_000, occurredAt: at("2026-06-15") }),
        tx({ kind: "expense", amount: 300_000, occurredAt: at("2026-06-15") }),
        tx({ kind: "transfer", amount: -500_000, occurredAt: at("2026-06-15") }),
      ],
      NOW,
    );
    expect(group!.subtotal).toBe(700_000); // 1_000_000 − 300_000, transfer ignored
  });

  it("a transfer-only day nets to zero", () => {
    const [group] = groupTransactionsByDay(
      [tx({ kind: "transfer", amount: -500_000, occurredAt: at("2026-06-15") })],
      NOW,
    );
    expect(group!.subtotal).toBe(0);
  });

  it("groups split across the ICT midnight boundary", () => {
    const groups = groupTransactionsByDay(
      [
        tx({ kind: "expense", amount: 10_000, occurredAt: new Date("2026-06-14T17:01:00Z") }), // 00:01 ICT 15th
        tx({ kind: "expense", amount: 20_000, occurredAt: new Date("2026-06-14T16:59:00Z") }), // 23:59 ICT 14th
      ],
      NOW,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-06-15", "2026-06-14"]);
  });

  it("returns [] for an empty list", () => {
    expect(groupTransactionsByDay([], NOW)).toEqual([]);
  });

  it("re-grouping a merged (load-more) array keeps the boundary day correct", () => {
    // Page 1 ends mid-day on the 14th; page 2 begins with more rows on the 14th.
    const page1 = [
      tx({ kind: "expense", amount: 65_000, occurredAt: at("2026-06-15") }),
      tx({ kind: "income", amount: 1_000_000, occurredAt: at("2026-06-14") }),
    ];
    const page2 = [
      tx({ kind: "expense", amount: 200_000, occurredAt: at("2026-06-14") }),
      tx({ kind: "expense", amount: 50_000, occurredAt: at("2026-06-13") }),
    ];
    const groups = groupTransactionsByDay([...page1, ...page2], NOW);
    expect(groups.map((g) => g.key)).toEqual(["2026-06-15", "2026-06-14", "2026-06-13"]);
    // The 14th merges both pages' rows; its subtotal recomputes over all of them.
    const day14 = groups.find((g) => g.key === "2026-06-14")!;
    expect(day14.items).toHaveLength(2);
    expect(day14.subtotal).toBe(800_000); // 1_000_000 − 200_000
  });
});
