# SpendWise — Design System (Mint)

**Register:** product  
**Source:** `final Figma design/styles/tokens.css`  
**Implementation:** `web/src/app/globals.css` + `web/src/components/ui/*`

## Typography

| Role | Family | Use |
|------|--------|-----|
| Display | Quicksand | Page titles, net-worth figures, card headings |
| Body | Nunito | UI labels, body copy, buttons, table text |

Scale (fixed rem, product register): display 40px hero · h1 30px · h2 22px · h3 18px · body 15px · sm 13px · xs 11.5px.

Numbers: `font-variant-numeric: tabular-nums` on all amounts.

## Color — Mint (brand)

| Token | Hex | Role |
|-------|-----|------|
| mint-500 | `#12B886` | Primary actions, active nav |
| mint-600 | `#0C9E74` | Hover primary |
| mint-700 | `#0A7D5C` | Text links on light |
| mint-100 | `#D2F8E7` | Soft fills, focus rings |
| mint-bright | `#25E6A6` | Chart accents on dark cards |

## Color — Ink (neutrals)

| Token | Hex | Role |
|-------|-----|------|
| ink-900 | `#0E2A22` | Primary text |
| ink-600 | `#4A645B` | Secondary text (≥4.5:1 on white) |
| ink-500 | `#6B847B` | Helper text |
| ink-400 | `#9AB0A8` | Placeholders, meta only — not body |
| line | `#E2ECE7` | Borders |

## Surfaces

| Token | Hex | Role |
|-------|-----|------|
| paper | `#FFFFFF` | Sidebar, cards, inputs |
| canvas | `#F2F7F4` | Main app background |
| canvas-2 | `#E9F1ED` | Outer / auth backdrop |
| tint | `#F6FBF8` | Subtle card tint |

## Money semantics

| Role | Foreground | Background |
|------|------------|------------|
| Income | `#12B886` | `#E4F8EF` |
| Expense | `#E26A57` | `#FCEDE9` |
| Invest | `#5B86E5` | `#EAF0FD` |
| Transfer | `#8A7FE0` | `#EFEDFB` |
| Pending | `#D99A2B` | `#FBF1DD` |

## Radius

sm 8 · md 12 · lg 16 · xl 22 · 2xl 28 · pill 999

## Motion (Impeccable product register)

- **Duration:** 150ms fast · 200ms base — no page-load choreography
- **Easing:** ease-out exponential (`cubic-bezier(0.16, 1, 0.3, 1)`)
- **Purpose:** hover, focus, press, route feedback only
- **Reduced motion:** instant transitions when `prefers-reduced-motion: reduce`

## Components

- **Button:** primary · ghost · soft — heights 42px / 50px lg
- **Input:** 46px, canvas fill, mint focus ring
- **Tag:** income · expense · invest · transfer · pending
- **App shell:** 248px sidebar, 72px topbar, mint-500 active nav
