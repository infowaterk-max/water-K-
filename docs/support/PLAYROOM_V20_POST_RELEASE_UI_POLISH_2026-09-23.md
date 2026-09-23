# Playroom v20 post-release UI polish — 2026-09-23

This pass closes the remaining Playroom visual defects without reopening commerce authority or adding a parallel renderer.

## Closed defects

- Újdonságok: gap restored before the newsletter panel.
- Catalog hero: desktop/tablet media height aligned to the copy panel.
- Contact: the existing Storefront Form Wizard remains the only form engine and is bounded on desktop.
- Category links: one shared webshop route with contextual headings; no duplicated category-page implementation.
- Header: misleading symbol-only desktop trigger hidden for Playroom; real mobile menu retained.
- Cart: Playroom-scoped top/bottom breathing room around the shared cart.
- Account: footer spacing, dark empty states and readable marketing-consent labels.
- Purchase / stock: add-to-cart uses the Playroom blue primary token; stock availability is red. Product-page red styling is scoped to the stock fragment only.

## Incident lesson

A first attempt put a plain, unmaterialized `style` object directly on `playroom-contact-form`. Strict Template Factory correctly rejected it with `QUALITY_RESPONSIVE_AUTHORITY_NOT_MATERIALIZED`. The corrected implementation removes that template-local style object and constrains the shared form component with a safe default that authored materialized styles may still override.

## Authority preserved

E2 remains catalog/filter authority; inventory remains stock authority; shared cart/checkout remain commerce authority; account navigation remains platform IA authority; production is untouched.

Validation note: exact-head CI, Template Factory and preview deploy must be green before acceptance.
