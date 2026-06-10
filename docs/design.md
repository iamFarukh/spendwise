# Layanan Digital Kota Medan — Design System

**Version:** 1.0
**Last updated:** 10 June 2026
**Surface:** Web portal (Next.js + Tailwind), with a mobile companion later
**Theme support:** Light + Dark (the portal ships a theme toggle)

> This is the single source of truth for color, type, spacing, components, and accessibility. Engineering consumes the tokens in §11 directly; design works from the primitives and semantic layers. **Do not hardcode hex values in components — always go through a semantic token.**

---

## 0. The brief, made explicit

| Axis               | Decision                                                                           | Why (grounded in the subject)                                                            |
| ------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Subject**        | Official municipal digital-services portal for Kota Medan                          | Citizens come to _do a task_ (pay tax, get an e-KTP, file a permit), not to browse       |
| **Audience**       | Every resident — wide age range, mixed devices, mixed connectivity, mixed literacy | Forces accessibility-first, not aesthetics-first                                         |
| **Brand pillars**  | **Efisien · Transparan · Terpercaya** (Efficient · Transparent · Trustworthy)      | These three words are the design's north star and are referenced in each principle below |
| **Page's one job** | Get a person to the right service in as few decisions as possible                  | Hero = task launcher, not marketing                                                      |

Government UI fails when it tries to be exciting. The discipline here is **calm, legible, fast, and obviously trustworthy** — green for civic growth and the city's identity, generous whitespace, and a single quiet level of visual richness on the service cards.

---

## 1. Design Principles

1. **Trust is built from clarity, not decoration (Terpercaya).** Restrained palette, high contrast, predictable layout. No effect exists unless it helps someone complete a task.
2. **Accessibility is a requirement, not a feature.** WCAG 2.1 **AA is the floor**, AAA for body text wherever achievable. A public service must work for everyone.
3. **Efficiency is measured in decisions, not pixels (Efisien).** Every screen reduces the number of choices to the next correct action. Primary action is always the most prominent green.
4. **Honesty in state (Transparan).** Loading, empty, error, and success states are designed first-class — they tell the truth plainly in the interface's own voice.
5. **One level of richness.** Spend visual interest on the service cards and the hero. Everything else stays quiet and disciplined.
6. **Bilingual-ready.** Layout tolerates Bahasa Indonesia ↔ English length differences; never hard-pin widths to one language's string length.

---

## 2. Color System

The system has three layers: **primitives** (raw scales, never used directly in components), **semantic tokens** (what components reference), and **theme maps** (light/dark resolution of semantics).

### 2.1 Primitive — `Daun` (primary / brand green)

The civic green: a leaf/sprout emerald that reads fresh in light UI and confident on fills.

| Token      | Hex       | Typical use                                                                       |
| ---------- | --------- | --------------------------------------------------------------------------------- |
| `daun-25`  | `#F6FEF9` | faintest tint, hover wash                                                         |
| `daun-50`  | `#ECFDF3` | badge / alert backgrounds, soft icon tiles                                        |
| `daun-100` | `#D1FADF` | subtle surfaces, selected rows                                                    |
| `daun-200` | `#A6F4C5` | borders on green surfaces                                                         |
| `daun-300` | `#6CE9A6` | decorative, charts                                                                |
| `daun-400` | `#32D583` | **dark-mode accent / link**                                                       |
| `daun-500` | `#12B76A` | hover fills, secondary brand                                                      |
| `daun-600` | `#039855` | **brand color**, primary fills (large/bold text), logo                            |
| `daun-700` | `#027A48` | **accessible action** — green text on white, default button fill for small labels |
| `daun-800` | `#05603A` | pressed state, dark accents                                                       |
| `daun-900` | `#054F31` | headings on green tints                                                           |
| `daun-950` | `#053321` | deepest                                                                           |

> **Contrast rule for green:** `daun-600` on white is ~3.7:1 — great for large/bold text and UI fills, **but not for normal body text**. For green text at body size on white, use `daun-700` (~5.4:1) or darker.

### 2.2 Primitive — `Abu` (neutral, green-tinted slate)

Neutrals carry a faint green undertone so grays sit in the same family as the brand instead of fighting it.

| Token     | Hex       | Use                                             |
| --------- | --------- | ----------------------------------------------- |
| `abu-0`   | `#FFFFFF` | base canvas (light)                             |
| `abu-25`  | `#FBFCFB` | alt canvas                                      |
| `abu-50`  | `#F7FAF8` | subtle section background, raised card on white |
| `abu-100` | `#EDF2EF` | hairline fills, disabled bg                     |
| `abu-200` | `#DEE6E1` | **default border / divider**                    |
| `abu-300` | `#C5D0C9` | strong border, dark-mode secondary text         |
| `abu-400` | `#9AA8A0` | placeholder, muted text, dark-mode muted        |
| `abu-500` | `#6E7D75` | secondary text                                  |
| `abu-600` | `#51605A` | body text (low emphasis)                        |
| `abu-700` | `#3C4943` | body text                                       |
| `abu-800` | `#28322D` | headings / dark-mode raised surface             |
| `abu-900` | `#18201C` | strongest text / dark-mode surface              |
| `abu-950` | `#0D1410` | dark-mode canvas                                |

### 2.3 Primitive — semantic hues

Each carries `-50` (background), `-500` (icon/illustration), `-600` (default), `-700` (text-on-light).

| Role                     | 50        | 500       | 600       | 700       |
| ------------------------ | --------- | --------- | --------- | --------- |
| **Success** `sukses`     | `#ECFDF3` | `#12B76A` | `#039855` | `#027A48` |
| **Warning** `peringatan` | `#FFFAEB` | `#F79009` | `#DC6803` | `#B54708` |
| **Error** `galat`        | `#FEF3F2` | `#F04438` | `#D92D20` | `#B42318` |
| **Info** `info`          | `#EFF8FF` | `#2E90FA` | `#1570EF` | `#175CD3` |

> Success shares the green family with the brand on purpose, but **never signal success with color alone** — always pair with an icon and text, since a green-on-green portal makes success easy to miss.

### 2.4 Semantic tokens (LIGHT theme)

These are what components reference. Names describe _role_, not color.

```
--bg-canvas            : abu-0      (#FFFFFF)
--bg-subtle            : abu-50     (#F7FAF8)
--bg-muted             : abu-100    (#EDF2EF)
--bg-surface           : abu-0      (#FFFFFF)   /* cards */
--bg-surface-hover     : abu-50
--bg-brand-subtle      : daun-50    (#ECFDF3)   /* icon tiles, populer badge */
--bg-brand             : daun-600   (#039855)   /* primary fills */
--bg-brand-hover       : daun-700   (#027A48)
--bg-brand-active      : daun-800   (#05603A)
--bg-inverse           : abu-900    (#18201C)

--text-primary         : abu-900    (#18201C)
--text-secondary       : abu-600    (#51605A)
--text-muted           : abu-400    (#9AA8A0)
--text-on-brand        : abu-0      (#FFFFFF)
--text-brand           : daun-700   (#027A48)   /* green text on light = AA */
--text-link            : daun-700
--text-link-hover      : daun-800

--border-default       : abu-200    (#DEE6E1)
--border-strong        : abu-300    (#C5D0C9)
--border-brand         : daun-600
--border-focus         : daun-600

--ring-focus           : rgba(3,152,85,0.24)    /* daun-600 @ 24% */
--icon-default         : abu-500
--icon-brand           : daun-600
```

### 2.5 Semantic tokens (DARK theme)

Dark mode raises the green to `daun-400/500` for legibility and lifts surfaces in steps.

```
--bg-canvas            : abu-950    (#0D1410)
--bg-subtle            : abu-900    (#18201C)
--bg-muted             : abu-800    (#28322D)
--bg-surface           : abu-900    (#18201C)
--bg-surface-hover     : abu-800
--bg-brand-subtle      : rgba(50,213,131,0.12)   /* daun-400 wash */
--bg-brand             : daun-500   (#12B76A)
--bg-brand-hover       : daun-400   (#32D583)
--bg-brand-active      : daun-600   (#039855)
--bg-inverse           : abu-50

--text-primary         : abu-50     (#F7FAF8)
--text-secondary       : abu-300    (#C5D0C9)
--text-muted           : abu-400    (#9AA8A0)
--text-on-brand        : abu-950    (#0D1410)    /* dark text on bright green */
--text-brand           : daun-400   (#32D583)
--text-link            : daun-400
--text-link-hover      : daun-300

--border-default       : abu-800    (#28322D)
--border-strong        : abu-700    (#3C4943)
--border-brand         : daun-500
--ring-focus           : rgba(50,213,131,0.32)
--icon-default         : abu-400
--icon-brand           : daun-400
```

### 2.6 Contrast reference (verify with a checker before ship)

Approximate WCAG ratios for the critical pairs. ✅ = AA pass for the noted size.

| Foreground               | Background               | Ratio (~) | Body (4.5)                      | Large/UI (3.0) |
| ------------------------ | ------------------------ | --------- | ------------------------------- | -------------- |
| `text-primary` #18201C   | white                    | ~15.8:1   | ✅ AAA                          | ✅             |
| `text-secondary` #51605A | white                    | ~7.4:1    | ✅ AAA                          | ✅             |
| `text-muted` #9AA8A0     | white                    | ~2.5:1    | ✖ (decorative/placeholder only) | ✖              |
| white                    | `bg-brand` #039855       | ~3.7:1    | ✖ (use bold ≥18.66px)           | ✅             |
| white                    | `bg-brand-hover` #027A48 | ~5.4:1    | ✅                              | ✅             |
| `text-brand` #027A48     | white                    | ~5.4:1    | ✅                              | ✅             |
| `daun-400` #32D583       | `abu-950` #0D1410        | ~9.6:1    | ✅ AAA                          | ✅             |

**Takeaway baked into the tokens:** small/normal-weight button labels and any green _text_ use `daun-700`; `daun-600` is reserved for fills with bold or large text and for non-text brand surfaces. `text-muted` is for placeholders and decoration only — never load-bearing text.

### 2.7 Do / Don't

- **Do** use `bg-brand-subtle` (daun-50) tiles behind service icons — matches the reference and keeps the green calm.
- **Do** keep exactly one primary green action per view.
- **Don't** put `daun-600` text at 14–16px on white (fails AA) — switch to `daun-700`.
- **Don't** use green as the _only_ indicator of success/selection — add an icon or label.
- **Don't** introduce a second saturated hue for decoration; the semantic hues are for state only.

---

## 3. Typography

### 3.1 Families (deliberate, subject-grounded pairing)

| Role                   | Family                | Rationale                                                                                                              |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Display / Headings** | **Plus Jakarta Sans** | An Indonesian-designed typeface — fitting for a Kota Medan civic product; geometric-humanist, confident at large sizes |
| **Body / UI**          | **Inter**             | Outstanding small-size legibility and proper tabular figures for tables, amounts, IDs                                  |
| **Data / Mono**        | **IBM Plex Mono**     | For document numbers (NIK, KK), reference codes, and aligned amounts                                                   |

```css
--font-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
--font-body: "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, monospace;
```

All three are free (Google Fonts). Self-host with `font-display: swap` and subset to `latin` + `latin-ext`.

### 3.2 Type scale

`size / line-height / weight / letter-spacing`. Use `rem` (root = 16px).

| Token        | Size             | Line | Weight     | Tracking           | Use                                 |
| ------------ | ---------------- | ---- | ---------- | ------------------ | ----------------------------------- |
| `display-lg` | 60px / 3.75rem   | 1.05 | 800        | −0.025em           | Hero ("Kota Medan")                 |
| `display-md` | 48px / 3rem      | 1.1  | 800        | −0.02em            | Big section openers                 |
| `heading-1`  | 36px / 2.25rem   | 1.15 | 700        | −0.015em           | Page title                          |
| `heading-2`  | 30px / 1.875rem  | 1.2  | 700        | −0.01em            | Section ("Layanan Utama")           |
| `heading-3`  | 24px / 1.5rem    | 1.25 | 600        | −0.01em            | Sub-section                         |
| `heading-4`  | 20px / 1.25rem   | 1.3  | 600        | 0                  | Card title                          |
| `title`      | 18px / 1.125rem  | 1.4  | 600        | 0                  | Strong inline                       |
| `body-lg`    | 18px / 1.125rem  | 1.6  | 400        | 0                  | Hero subtitle                       |
| `body-md`    | 16px / 1rem      | 1.6  | 400        | 0                  | **Base body**                       |
| `body-sm`    | 14px / 0.875rem  | 1.55 | 400        | 0                  | Captions, helper                    |
| `caption`    | 13px / 0.8125rem | 1.5  | 500        | 0.005em            | Card meta, table secondary          |
| `eyebrow`    | 12px / 0.75rem   | 1.4  | 600        | 0.08em (UPPERCASE) | "Portal Resmi…" pill, category tags |
| `data`       | 14px / 0.875rem  | 1.5  | 500 (mono) | 0                  | NIK, amounts, codes                 |

### 3.3 Responsive display (fluid hero)

```css
--display-lg: clamp(2.5rem, 6vw + 1rem, 3.75rem); /* 40 → 60px */
--display-md: clamp(2rem, 4vw + 1rem, 3rem); /* 32 → 48px */
--heading-1: clamp(1.75rem, 2vw + 1rem, 2.25rem); /* 28 → 36px */
```

### 3.4 Rules

- Headings use `--font-display`; everything else `--font-body`.
- Numbers in tables/amounts use `font-variant-numeric: tabular-nums`.
- Max measure for reading text: **70ch**; never let body run edge-to-edge on wide screens.
- Sentence case for UI and headings (matches the reference). Reserve uppercase for `eyebrow` only.

---

## 4. Spacing & Layout

### 4.1 Spacing scale (4px base)

| Token     | px  |     | Token      | px  |
| --------- | --- | --- | ---------- | --- |
| `space-0` | 0   |     | `space-6`  | 24  |
| `space-1` | 4   |     | `space-8`  | 32  |
| `space-2` | 8   |     | `space-10` | 40  |
| `space-3` | 12  |     | `space-12` | 48  |
| `space-4` | 16  |     | `space-16` | 64  |
| `space-5` | 20  |     | `space-20` | 80  |
|           |     |     | `space-24` | 96  |
|           |     |     | `space-32` | 128 |

Section vertical rhythm: `space-20`/`space-24` between major sections on desktop, `space-12`/`space-16` on mobile.

### 4.2 Breakpoints

| Name  | Min width | Notes                                   |
| ----- | --------- | --------------------------------------- |
| `sm`  | 640px     | large phone                             |
| `md`  | 768px     | tablet                                  |
| `lg`  | 1024px    | small laptop — nav switches to full row |
| `xl`  | 1280px    | desktop (reference layout)              |
| `2xl` | 1536px    | wide                                    |

### 4.3 Container & grid

- Max content width: **1200px**, centered, gutter `space-6` (mobile) → `space-8` (desktop).
- Service cards: 12-col grid → **4 columns** at `lg+`, **2** at `md`, **1** at `sm`. Gap `space-6`.

---

## 5. Radius

| Token         | px   | Use                               |
| ------------- | ---- | --------------------------------- |
| `radius-xs`   | 4    | tags, tiny chips                  |
| `radius-sm`   | 6    | inputs, small buttons             |
| `radius-md`   | 8    | inputs, default                   |
| `radius-lg`   | 12   | **buttons, search bar**           |
| `radius-xl`   | 16   | **service cards**                 |
| `radius-2xl`  | 20   | hero panels, modals               |
| `radius-full` | 9999 | pills, badges, avatar, icon tiles |

Matches the reference: soft `radius-lg` buttons, `radius-xl` cards, fully-round badges.

---

## 6. Elevation (restrained — government calm)

```css
--shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
--shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06);
--shadow-md:
  0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
--shadow-lg:
  0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03);
/* brand-tinted lift for hovered service cards */
--shadow-brand: 0 8px 24px -6px rgba(3, 152, 85, 0.18);
```

Default cards rest on `--shadow-sm` with a `--border-default` hairline; on hover they rise to `--shadow-brand`. Dark mode replaces shadows with `--border-strong` + slight surface lift (shadows read poorly on dark).

---

## 7. Iconography

- **Library:** Lucide (open-source, consistent 24px grid, civic-neutral). Stroke `1.75px`, `round` caps/joins.
- Default size **20px** inline, **24px** in nav, **24px** inside `40×40` `daun-50` rounded-`full` tiles on service cards (matches reference).
- Icon color follows `--icon-default`; brand icons use `--icon-brand`.
- Pair icons with text labels; never icon-only for primary navigation (literacy + screen readers).

---

## 8. Motion

```css
--duration-fast: 120ms;
--duration-base: 200ms;
--duration-slow: 320ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1); /* most transitions */
--ease-entrance: cubic-bezier(0, 0, 0.2, 1); /* enter */
--ease-exit: cubic-bezier(0.4, 0, 1, 1); /* exit */
```

- Hover/press feedback: `--duration-fast`, `--ease-standard`.
- Card hover: translateY(−2px) + shadow swap over `--duration-base`.
- **Respect `prefers-reduced-motion: reduce`** → disable transforms and non-essential transitions; keep opacity-only fades. This is mandatory for a public service.

---

## 9. Components

Each spec is **anatomy → tokens → states**. Reference tokens, never raw hex.

### 9.1 Button

Sizes: `sm` (h 36, px space-3, body-sm), `md` (h 44, px space-4, body-md) — default, `lg` (h 52, px space-5, body-md). Radius `radius-lg`. Icon gap `space-2`. **Min height 44px = touch target.**

| Variant              | Rest                                          | Hover             | Active            | Focus              | Disabled                             |
| -------------------- | --------------------------------------------- | ----------------- | ----------------- | ------------------ | ------------------------------------ |
| **Primary**          | `bg-brand` / `text-on-brand`                  | `bg-brand-hover`  | `bg-brand-active` | + 4px `ring-focus` | `bg-muted` / `text-muted`, no shadow |
| **Secondary**        | `bg-surface`, `border-strong`, `text-primary` | `bg-subtle`       | `bg-muted`        | + ring             | muted text/border                    |
| **Tertiary (ghost)** | transparent, `text-brand`                     | `bg-brand-subtle` | daun-100          | + ring             | `text-muted`                         |
| **Destructive**      | `galat-600` / white                           | `galat-700`       | darker            | + red ring         | muted                                |

> The reference's "Mulai Layanan" = Primary with trailing arrow; "Bantuan 24/7" = Secondary with leading phone icon. Loading state: replace label with spinner, keep width, set `aria-busy`.

### 9.2 Service card (the 4 cards)

Anatomy: `40×40` `daun-50` rounded-`full` icon tile → `heading-4` title → `body-sm` `text-secondary` description → bottom `eyebrow` category tag. Optional top-right **"Populer"** badge.

- Container: `bg-surface`, `border-default`, `radius-xl`, padding `space-5`, `--shadow-sm`.
- **Hover:** `border-brand` (subtle), `--shadow-brand`, translateY(−2px); icon tile → `daun-100`.
- **Focus-within / keyboard:** full-card focus ring; entire card is one link (single tab stop), not nested links.

### 9.3 Badge / Pill

| Type                 | Style                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Populer**          | `bg-brand-subtle` (daun-50) + `text-brand` (daun-700) + `eyebrow`, `radius-full`, px `space-2` |
| **Status: success**  | `sukses-50` bg + `sukses-700` text + dot                                                       |
| **Status: pending**  | `peringatan-50` + `peringatan-700`                                                             |
| **Status: rejected** | `galat-50` + `galat-700`                                                                       |
| **Category tag**     | `bg-muted` + `text-secondary`, `eyebrow`                                                       |

Always: icon or dot + text (color is never the only signal).

### 9.4 Top navigation

Height 64px, `bg-canvas`, bottom `border-default`, sticky. Left: logo + wordmark. Center/right: links (`body-sm` `text-secondary`, active → `text-brand` with 2px `daun-600` underline). Right cluster: search, notification (badge = `galat-600` dot), theme toggle, language (ID/EN), **Masuk** = Primary `sm` button. Collapses to a hamburger + drawer below `lg`.

### 9.5 Search input

`bg-subtle`, `border-default`, `radius-lg`, h 44, leading search icon (`icon-muted`), placeholder `text-muted`. Focus: `border-brand` + `ring-focus`. Submit on Enter; results live-region announced.

### 9.6 Text input / Select

`bg-surface`, `border-default`, `radius-md`, h 44, padding `space-3`. Label always visible above (never placeholder-as-label). States: focus (`border-brand` + ring), error (`galat-600` border + `galat-700` helper text + icon), disabled (`bg-muted`). Helper/error text `body-sm` below.

### 9.7 Hero

Eyebrow pill ("Portal Resmi…") with leading `daun-500` dot → `display-lg` two-line title (line 2 in `text-brand`) → `body-lg` `text-secondary` subtitle → pillars row → primary + secondary buttons. Centered, max width ~720px, generous `space-24` top padding.

---

## 10. Accessibility (non-negotiable for a public service)

- **Target WCAG 2.1 AA** site-wide; **AAA** for body text where the contrast table allows.
- **Visible focus** on every interactive element: 4px `ring-focus`, never `outline: none` without a replacement.
- **Touch targets ≥ 44×44px**; spacing between adjacent targets ≥ `space-2`.
- **Color is never the sole carrier of meaning** — pair with icon, text, or shape.
- **Keyboard:** full operability, logical tab order, a **"Lewati ke konten" (skip-to-content)** link as first focusable element.
- **Screen readers:** semantic landmarks (`header/nav/main/footer`), labelled forms, `aria-live` for search results and toasts, `lang="id"` on `<html>` (switch with language toggle).
- **Reduced motion** respected (see §8).
- **Zoom:** layout survives 200% browser zoom and 320px width without horizontal scroll.

---

## 11. Implementation — tokens as code

### 11.1 CSS custom properties (drop into global stylesheet)

```css
:root {
  /* primitives — primary */
  --daun-50: #ecfdf3;
  --daun-100: #d1fadf;
  --daun-400: #32d583;
  --daun-500: #12b76a;
  --daun-600: #039855;
  --daun-700: #027a48;
  --daun-800: #05603a;
  /* primitives — neutral */
  --abu-0: #ffffff;
  --abu-50: #f7faf8;
  --abu-100: #edf2ef;
  --abu-200: #dee6e1;
  --abu-300: #c5d0c9;
  --abu-400: #9aa8a0;
  --abu-500: #6e7d75;
  --abu-600: #51605a;
  --abu-700: #3c4943;
  --abu-800: #28322d;
  --abu-900: #18201c;
  --abu-950: #0d1410;

  /* semantic (light) */
  --bg-canvas: var(--abu-0);
  --bg-subtle: var(--abu-50);
  --bg-surface: var(--abu-0);
  --bg-brand-subtle: var(--daun-50);
  --bg-brand: var(--daun-600);
  --bg-brand-hover: var(--daun-700);
  --text-primary: var(--abu-900);
  --text-secondary: var(--abu-600);
  --text-muted: var(--abu-400);
  --text-on-brand: var(--abu-0);
  --text-brand: var(--daun-700);
  --border-default: var(--abu-200);
  --border-strong: var(--abu-300);
  --border-brand: var(--daun-600);
  --ring-focus: rgba(3, 152, 85, 0.24);

  /* radius / shadow / motion */
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --shadow-sm:
    0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-brand: 0 8px 24px -6px rgba(3, 152, 85, 0.18);
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

[data-theme="dark"] {
  --bg-canvas: var(--abu-950);
  --bg-subtle: var(--abu-900);
  --bg-surface: var(--abu-900);
  --bg-brand-subtle: rgba(50, 213, 131, 0.12);
  --bg-brand: var(--daun-500);
  --bg-brand-hover: var(--daun-400);
  --text-primary: var(--abu-50);
  --text-secondary: var(--abu-300);
  --text-muted: var(--abu-400);
  --text-on-brand: var(--abu-950);
  --text-brand: var(--daun-400);
  --border-default: var(--abu-800);
  --border-strong: var(--abu-700);
  --border-brand: var(--daun-500);
  --ring-focus: rgba(50, 213, 131, 0.32);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

### 11.2 Tailwind v4 (`@theme`) — matches your stack

```css
@import "tailwindcss";

@theme {
  --color-brand: #039855;
  --color-brand-hover: #027a48;
  --color-brand-subtle: #ecfdf3;
  --color-surface: #ffffff;
  --color-canvas: #f7faf8;
  --color-ink: #18201c;
  --color-ink-soft: #51605a;
  --color-border: #dee6e1;

  --font-display: "Plus Jakarta Sans", "Inter", sans-serif;
  --font-sans: "Inter", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;

  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

> On Tailwind v3, put the equivalent values in `theme.extend.colors` / `fontFamily` / `borderRadius` instead. Either way, components use class names like `bg-brand text-white`, never raw hex.

### 11.3 Token governance

- Component code references **semantic** tokens only (`--bg-brand`, not `--daun-600`).
- Add a new primitive only when no existing scale step fits; add a new semantic token only when a genuinely new role appears.
- Dark mode is achieved purely by remapping semantics — components never branch on theme.

---

## 12. What ships in v1 vs later

**v1 (this doc covers fully):** color system + light/dark, type scale, spacing/grid, radius/shadow/motion, Button, Service card, Badge, Nav, Search, Input, Hero, accessibility baseline, tokens.

**Later:** data tables & pagination, multi-step forms (KTP/permit flows), file upload, toast/notification center, stepper/wizard, charts (Recharts theming off `daun`/semantic hues), map components, skeleton loaders.
