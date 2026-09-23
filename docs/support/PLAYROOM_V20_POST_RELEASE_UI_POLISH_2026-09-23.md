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

## Dynamic Support Intake Wizard

The contact wizard is a shared storefront capability, not a Playroom-local form. Its UX contract is now topic-first:

- the first screen contains compact topic controls only; it does not request name, e-mail or order number;
- desktop uses a two-column selector: compact topics on the left and a hover/focus explanation panel on the right;
- mobile uses compact accordion rows with an explicit Ezt választom action, because hover has no mobile equivalent;
- topic selection immediately routes to a branch-specific clarification step;
- only relevant fields are requested: for example Általános információ never asks for an order number, while order/product-return branches do;
- the selected clarification is stored in the canonical support subject, so branch detail is not discarded by the support API;
- contact details are requested later, after the issue has been classified;
- the legacy contact fallback delegates to the same shared wizard, so templates do not get divergent support-form behavior.

Presentation remains template-owned through storefront CSS variables and authored component styles. Routing, validation, responsive behavior and submission stay shared.

## Incident lesson

A first attempt put a plain, unmaterialized style object directly on playroom-contact-form. Strict Template Factory correctly rejected it with QUALITY_RESPONSIVE_AUTHORITY_NOT_MATERIALIZED. The corrected implementation removes that template-local style object and constrains the shared form component with a safe default that authored materialized styles may still override.

## Authority preserved

E2 remains catalog/filter authority; inventory remains stock authority; shared cart/checkout remain commerce authority; account navigation remains platform IA authority; production is untouched.

Validation note: exact-head CI, Template Factory and preview deploy must be green before acceptance.
