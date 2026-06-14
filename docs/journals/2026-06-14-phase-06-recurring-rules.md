# Phase 6 Recurring Rules Completion

**Date**: 2026-06-14
**Severity**: Medium (new surface; ledger-writing automation + concurrency)
**Component**: Recurring rules, materialisation, transactions edit flow
**Status**: Complete (committed `e219cc2` on `phase-06-recurring-rules`)

## What Happened

Shipped recurring-rule CRUD driven by RFC 5545 RRULE strings with **lazy
materialisation**: reading `/recurring` or `/transactions` (and, later, the Phase 9
cron) expands each due rule's occurrences within a 30-day lead window into real
`transactions` rows. Matches wireframe 09 (30-day projection card, active/paused/all
filter, rule cards with cadence/due pills). Edit semantics ship as **2 modes** —
"this only" detaches a single row; "edit series" mutates the rule forward — surfaced
when tapping a recurring-generated transaction in the ledger. All gates green:
typecheck, lint, build (`/recurring` route, 13 routes), 118 unit tests (4 new files,
14 tests).

No schema delta — Phase 3 already owns `recurring_rules`, the `transactions.recurring_rule_id`
FK (`ON DELETE SET NULL`), and the `(recurring_rule_id, occurred_at)` partial unique index.

## Technical Details

- **TZ anchor (key decision):** every occurrence is anchored at **12:00 UTC = 19:00
  ICT**, mid-VN-day. Vietnam has no DST, so a fixed noon anchor keeps the displayed
  VN calendar day _and_ the generated `occurred_month_ict` bucket deterministic, and
  gives a stable `occurred_at` so the dedupe index works — all without pulling in
  luxon/TZID machinery the plan had suggested. Documented in `lib/rrule-builder.ts`.
- **No `dtstart` column:** DTSTART is embedded in the stored `rrule` string
  (`rrulestr` parses the `DTSTART:…\nRRULE:…` block). Window-start floor is
  `last_materialised_at ?? DTSTART`.
- **Idempotent + concurrency-safe materialisation:** each rule processed in its own
  `db.transaction` holding `pg_advisory_xact_lock(hashtext('rule:'||id))`. After the
  lock, the rule is re-read inside the tx, so a caller that lost the race sees the
  advanced cursor and does no duplicate work; the partial unique index is the
  belt-and-suspenders. Occurrences batch-insert with `ON CONFLICT DO NOTHING`.
- **Cursor advance:** after each pass, `last_materialised_at = window_end` and
  `next_due = next occurrence strictly after window_end`; a rule with no further
  occurrence (UNTIL/COUNT exhausted) flips `active = false`.
- **Isomorphic builder:** `rrule-builder.ts` builds the final RRULE client-side via
  the preset UI (freq chips + interval + weekday/month-day) or an expert raw textarea;
  the server re-validates (parse + 500-char cap → DoS guard). Same module powers the
  Vietnamese cadence text (`describeRrule`) and the next-3-dates preview.
- **Edit-instance flow:** threaded `recurring_rule_id` through `listTransactions` /
  `TxListItem` (additive field). Tapping a recurring row opens a 2-mode dialog —
  "this only" calls `detachInstance` (nulls the FK) then opens the normal edit sheet;
  "edit series" deep-links `/recurring?edit=<ruleId>`, which auto-opens the rule form.

## Decisions

- **Pause keeps already-materialised rows** (user decision). Pausing only stops future
  materialisation; existing/future-dated rows stay as historical/expected entries and
  the user removes them manually. No destructive bulk delete on pause.
- **Full edit-instance surfacing now** (user decision) rather than deferring the
  cross-feature tx-list wiring — keeps README's "edit one vs series" promise whole.
- **Cut "this + future" 3rd edit mode** — already locked in the red-team Q2 decision;
  honoured.

## Impact / Follow-ups

- Materialised rows are ordinary `transactions`, so they flow into budgets, spending,
  and (Phase 8) reports automatically via `occurred_month_ict`.
- Phase 9 cron reuses `materialiseDueInstances` unchanged and will read
  `next_due` + `notified_at` to send Telegram alerts.
- `rrule` added with `--legacy-peer-deps` (pre-existing better-auth ↔ drizzle-kit/orm
  peer conflict in the lockfile; `rrule` has no peers, so this is inert).

## Testing

- `rrule-builder.test.ts` — 8-pattern build→parse→build roundtrip, VN cadence text,
  noon-UTC anchor + VN-date mapping (11 assertions).
- `materialise-idempotent.test.ts` — second pass inserts 0; cursor advances once.
- `materialise-concurrent.test.ts` — two parallel calls insert each instance exactly
  once (advisory lock).
- `materialise-edit-series.test.ts` — amount edit applies to future occurrences only;
  past rows keep original values.
