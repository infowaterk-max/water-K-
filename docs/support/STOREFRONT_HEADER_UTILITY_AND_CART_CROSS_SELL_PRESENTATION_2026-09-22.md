# Storefront header utility + cart cross-sell presentation hardening — 2026-09-22

## Defects

1. A `system.commerce-header` template could show text labels on desktop while mobile used symbols, so the same actions changed presentation by viewport.
2. Template-owned arbitrary glyphs made the cart action visually ambiguous.
3. The shared cart cross-sell used legacy `featurePanel` / `btnGhost` presentation and could become a high-contrast white block inside a dark template, with unreadable heading and CTA colors.

## Shared fixes

- Canonical commerce utility actions are resolved semantically by route:
  - `/kedvencek` and `/fiokom/kivansaglista` → heart icon;
  - `/fiokom` → account/person icon;
  - `/kosar` → classic shopping-cart icon.
- Canonical utilities are icon-only on desktop, tablet and mobile. Accessible names remain through `aria-label` and `title`; template glyphs are only used for unknown custom actions.
- The account auth trigger accepts the same React icon node as normal utility links, so signed-out modal behavior does not fork presentation authority.
- The shared cart cross-sell consumes the active cart/template CSS variables (`--card`, `--ink`, `--muted`, `--line`) and uses the primary CTA treatment with a 44px minimum target.

## Regression rule

ONE DEFECT → ONE SHARED FIX → REGRESSION TEST → TEMPLATE FACTORY QUALITY GATE.

Do not repair these defects with Playroom-only CSS or by duplicating header action implementations inside templates.
