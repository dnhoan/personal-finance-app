# Design Guidelines — Personal Finance

Single-user PWA. Mobile-first. VN locale, Vietnamese UI (English deferred Phase 2+). shadcn/ui + Tailwind v4.

## Mood / Personality

`trustworthy` · `calm` · `warm-modern` · `legible-first` · `quietly-confident`

Reject: aggressive fintech neon-green/black, neobank purple gradients, generic SaaS cobalt. Money matters — feel earned-not-flashy.

## Color Palette

Built on a warm-slate neutral (not pure grey) + indigo-ink primary + sage accent. Pairs with shadcn/ui defaults (HSL-based, all WCAG AA).

### Light theme

| Token             | Hex       | Usage                                        |
| ----------------- | --------- | -------------------------------------------- |
| `--bg`            | `#FAF8F5` | App background (warm off-white, not sterile) |
| `--surface`       | `#FFFFFF` | Cards, sheets                                |
| `--surface-muted` | `#F2EFEA` | Inputs, inactive chips                       |
| `--border`        | `#E6E1D8` | Hairlines                                    |
| `--fg`            | `#1B1D23` | Primary text                                 |
| `--fg-muted`      | `#5E5D63` | Secondary text                               |
| `--fg-subtle`     | `#8E8B87` | Tertiary / labels                            |
| `--primary`       | `#2E3A59` | Indigo-ink — buttons, links, brand           |
| `--primary-fg`    | `#FAF8F5` | On primary                                   |
| `--accent`        | `#7BA686` | Sage — secondary CTA, focus rings            |

### Dark theme

| Token             | Hex       |
| ----------------- | --------- |
| `--bg`            | `#15161A` |
| `--surface`       | `#1E2027` |
| `--surface-muted` | `#262932` |
| `--border`        | `#2F3340` |
| `--fg`            | `#EDECE8` |
| `--fg-muted`      | `#A6A39D` |
| `--fg-subtle`     | `#74726E` |
| `--primary`       | `#A8B6D9` |
| `--primary-fg`    | `#15161A` |
| `--accent`        | `#8FBE9C` |

### Semantic (both themes — same hue, shifted lightness)

| Token            | Light     | Dark      | Usage                                |
| ---------------- | --------- | --------- | ------------------------------------ |
| `--income`       | `#2F855A` | `#7BC79B` | Income transactions, positive deltas |
| `--income-soft`  | `#E6F2EB` | `#1F3127` | Income chip bg                       |
| `--expense`      | `#B4423A` | `#E89A92` | Expense transactions, over-budget    |
| `--expense-soft` | `#F7E8E6` | `#3A2422` | Expense chip bg                      |
| `--transfer`     | `#5E5D63` | `#A6A39D` | Transfers (neutral grey)             |
| `--warning`      | `#B57B14` | `#E0B560` | Budget approaching limit             |
| `--danger`       | `#B4423A` | `#E89A92` | Destructive, debt overdue            |

Charts: income/expense use the semantic pair above; category breakdown uses an 8-step palette derived from primary `#2E3A59` rotated through HSL.

## Typography

Both fonts have full Vietnamese diacritic support (latin-ext + vietnamese subsets).

- **Body / UI**: `Plus Jakarta Sans` (weights 400/500/600/700). Modern geometric humanist, slightly rounder than Inter → warmer feel, excellent Vietnamese rendering.
- **Display / amounts**: `Fraunces` (weights 400/600 — variable `opsz` + `SOFT` axes). Contemporary serif with soft optical sizing — gives big VND numbers a tactile, considered feel. Used for: hero amounts, screen titles, empty-state headlines.
- **Numeric tabular**: `Plus Jakarta Sans` with `font-variant-numeric: tabular-nums` for transaction lists & budget tables.

```
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap');
```

### Type scale (mobile-first, 16px base)

| Token         | Size / line-height | Weight | Font     | Use                                |
| ------------- | ------------------ | ------ | -------- | ---------------------------------- |
| `display`     | 40 / 44            | 600    | Fraunces | Hero amount on dashboard           |
| `h1`          | 28 / 34            | 600    | Fraunces | Screen titles                      |
| `h2`          | 22 / 28            | 600    | Jakarta  | Section headers                    |
| `h3`          | 18 / 24            | 600    | Jakarta  | Card titles                        |
| `body`        | 15 / 22            | 400    | Jakarta  | Default text                       |
| `body-strong` | 15 / 22            | 600    | Jakarta  | Amounts in lists, emphasis         |
| `small`       | 13 / 18            | 400    | Jakarta  | Meta, helpers                      |
| `caption`     | 11 / 14            | 500    | Jakarta  | Labels, uppercase tracking +0.04em |

## Spacing — 4pt baseline

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Cards default `p-16`; bottom-sheets `p-24`; touch targets ≥44px.

## Radius

| Token  | px   | Use                |
| ------ | ---- | ------------------ |
| `sm`   | 6    | Chips, badges      |
| `md`   | 12   | Inputs, buttons    |
| `lg`   | 20   | Cards, sheets      |
| `full` | 9999 | FAB, avatar, pills |

## Shadows / Elevation

| Level | Value                                                           | Use                     |
| ----- | --------------------------------------------------------------- | ----------------------- |
| `e1`  | `0 1px 2px rgba(27,29,35,0.04)`                                 | Cards at rest           |
| `e2`  | `0 4px 12px rgba(27,29,35,0.06), 0 1px 3px rgba(27,29,35,0.04)` | Raised cards, FAB rest  |
| `e3`  | `0 16px 40px rgba(27,29,35,0.12)`                               | Bottom-sheets, popovers |

Dark theme: replace rgba `27,29,35` → `0,0,0` and increase alpha by ~1.5×.

## Iconography

**Lucide** (default with shadcn/ui). 20px in lists, 24px in FAB, 16px inline. Stroke `1.75`.

Finance-specific (use existing Lucide):

- Wallet → `Wallet`, Account types → `Coins` (cash) / `Landmark` (bank) / `CreditCard` (card) / `Smartphone` (e-wallet) / `HandCoins` (debt)
- Category → `Tag`, Budget → `Target`, Recurring → `Repeat`, Goal → `Flag`, Transfer → `ArrowLeftRight`, Telegram → `Send`

## Motion

- **Duration**: `fast 120ms` · `base 200ms` · `slow 320ms`
- **Easing**: `standard cubic-bezier(0.2, 0, 0, 1)` (Material emphasized) · `decel cubic-bezier(0, 0, 0, 1)` for entries · `accel cubic-bezier(0.3, 0, 1, 1)` for exits
- **Key transitions**:
  - Bottom-sheet up: `slow` `decel`, translateY 100% → 0 + backdrop fade-in
  - FAB tap: scale 1 → 0.94 → expand into sheet (shared element if feasible)
  - List-item amount update: `base` colour pulse (income/expense soft bg) then fade
  - Tab switch: `fast` opacity crossfade only
- Respect `prefers-reduced-motion` → collapse all to ≤80ms opacity-only.

## Component Conventions

- **Buttons**: primary = filled `--primary`; secondary = outline `--border`; tertiary = ghost text. Height 44px mobile / 40px desktop. Radius `md`.
- **Inputs**: 48px mobile (touch), bordered, focus ring 2px `--accent` offset 2px. `inputmode="decimal"` for VND amount fields.
- **List items**: 64px row, icon-left (40px circle in tinted bg), title + meta stack, amount right-aligned bold tabular.
- **Cards**: `surface` bg, `radius-lg`, `e1` rest / `e2` hover, `p-16` to `p-24`.
- **Bottom-sheet**: `surface`, `radius-lg` top-only, `e3`, drag handle 36×4px at top, max-height 90vh, safe-area-inset-bottom respected.
- **Chart axis**: `--fg-subtle` 11px, gridlines `--border` dashed; tooltip `surface` + `e2`.

## VND Amount Display Rules

- Format: `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND', maximumFractionDigits:0})` → `2.450.000 ₫`. Period thousands separator, ₫ suffix, **no decimals ever**.
- **Bold + Fraunces** for primary amounts (dashboard hero, transaction amount in detail view, card balances).
- **Bold + Jakarta tabular-nums** for amounts in lists, tables, budget rows (alignment-critical).
- **Color coding**:
  - Income → `--income` (`#2F855A`) with optional leading `+`.
  - Expense → `--expense` (`#B4423A`) with optional leading `−` (minus sign U+2212, not hyphen).
  - Transfer → `--fg-muted` (no sign).
  - Pending / draft → `--fg-subtle`.
- Over-budget delta: prefix `−` and use `--expense`; under-budget: prefix `+` and use `--income`.
- Never abbreviate (`2.4M ₫`) in primary view. Allow `2,4 tr ₫` only in tight chart tooltips with a `title` showing full value.
- Input field placeholder hint: `50k · 1tr · 1,5tr` (the parser handles these).

## Accessibility Floor (non-negotiable)

- Touch targets ≥44px. Focus ring always visible. Body contrast 4.5:1, large 3:1.
- Color never alone — pair red/green with sign (`+/−`) and/or icon (`ArrowUp` / `ArrowDown`).
- All form fields explicit `<label>` or `aria-label`. Error states: red border + icon + text.

## Unresolved Questions

1. Should we offer a per-user accent override (e.g. swap sage → warm coral) as a Settings preference for differentiation?
2. Dashboard hero amount: show "net cash flow" (in − out) or "available to spend" (budget − spent)? Currently planning net cash flow; revisit after first usage.
3. Confirm Fraunces optical-sizing performance impact on mobile — fall back to weight-only if FCP regresses.
