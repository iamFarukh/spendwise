# Product

## Register

product

## Users

Power users tracking personal finances with meticulous reconciliation habits. They use SpendWise daily for under two minutes: quick entry, balance checks, and catching missing transactions. Context: evening review at a desk or quick mobile glance — calm, focused, no hype.

## Product Purpose

A personal ledger of truth that answers: where did every unit of money come from, move, and was spent? Not budgeting theater, not portfolio performance — honest accounting with one rule (only expenses count as spending).

## Brand Personality

Calm · Precise · Trustworthy. The interface feels like a well-maintained ledger: legible numbers, restrained mint accent, no gamification.

## Anti-references

- Mint / YNAB envelope guilt and savings gamification
- Generic fintech SaaS (navy gradients, hero metrics, AI slop)
- Crypto/trading dashboards (neon, chart overload)
- Playful consumer finance (coins, mascots, confetti)
- Raw spreadsheet ugliness without hierarchy

## Design Principles

1. **Truth before decoration** — every visual element serves reconciliation or entry speed.
2. **One rule, always visible** — expense vs transfer vs investment must never confuse.
3. **Numbers are first-class** — tabular figures, high contrast, scannable amounts.
4. **Restrained mint** — accent on primary actions and active nav only; surfaces stay quiet.
5. **State honesty** — loading, empty, error, and success are designed, not afterthoughts.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Keyboard-operable app shell. `prefers-reduced-motion` respected. Color never the sole signal for transaction type (icon + label + amount sign).

## Visual source of truth

Figma mint system in `final Figma design/` (tokens: `styles/tokens.css`). Engineering tokens live in `web/src/app/globals.css`. Do not revert to `docs/design.md` (legacy Kota Medan doc).
