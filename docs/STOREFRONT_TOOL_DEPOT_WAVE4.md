# Storefront Implementation Wave 4 — E11 Professional / B2B Experience + Golden #4 Tool Depot

## Purpose

Wave 4 implements **E11 — Professional / B2B Experience v1** and consumes it in **Golden #4 Tool Depot**.

Wave 4 is a storefront/runtime read-model and presentation layer. It does not create a second B2B authority. Existing server-side customer role, channel, pricing, stock, MOQ/order-multiple, RFQ/offer and checkout authorities remain authoritative.

## Dependency chain

Wave 4 starts from Wave 3 final head:

`3b8e1853ae92237e8cc72ca7e7f348446d5259f5`

Stacked dependency order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — E7 / Golden #2 Tech Deck
5. PR #124 — E10 / Golden #3 Heritage Atelier
6. Wave 4 — E11 / Golden #4 Tool Depot

Wave 4 must remain stacked until the lower layers land in order.

## E11 — Professional / B2B Experience v1

Engine version:

`shoporation.professional-b2b-experience.v1`

### Server-authoritative boundaries

E11 explicitly treats the following as server authority:

- B2B approval / role;
- B2C/B2B channel visibility;
- pricing and tax presentation evidence;
- stock;
- MOQ and order multiple;
- RFQ / offer state;
- offer acceptance eligibility;
- reorder revalidation.

The Builder and storefront runtime only present these states. They do not recalculate or persist them as a second source of truth.

### Customer / partner experience

Partner-specific surfaces become active only when a server-authoritative snapshot says:

- channel = `b2b`;
- account status = `approved`;
- reseller/partner approval = true.

Pending, suspended, guest or non-approved contexts do not receive approved-partner presentation merely because a template block exists.

### Product read model

A professional product snapshot contains server-supplied:

- product and variant identity;
- SKU / cikkszám;
- name and safe product href;
- channel visibility;
- stock quantity / stock label;
- net and gross display-price evidence;
- price-authority label;
- minimum quantity;
- order multiple;
- RFQ availability.

`buildProfessionalProductReadModel` preserves server-supplied pricing/stock evidence and marks the result `requiresServerRevalidation=true`.

Hidden-channel products fail closed and do not produce a professional read model.

### Quantity hints

`buildProfessionalQuantityHint` may suggest the next quantity that conforms to the displayed MOQ/order-multiple rules, but this is explicitly a **client hint only**.

The final quantity, availability and commercial eligibility must be revalidated by server/checkout authority.

### RFQ and offer presentation

Offer acceptance UI is enabled only when the server-authoritative snapshot says:

- offer status is `sent`;
- acceptance is allowed;
- the supplied acceptance href passes the storefront URL allowlist.

Expired/cancelled/non-acceptable offers cannot be made acceptable by template configuration.

### Reorder

Reorder rows preserve product/variant/SKU/previous-quantity evidence, but every row is marked for server revalidation.

Historical price, stock, MOQ or order-multiple state is never treated as current authority.

### Quick order / SKU input

Wave 4 adds normalization for SKU/cikkszám quick-order input and presentation components for SKU-based workflows. This does not bypass catalog visibility or checkout validation.

## Template-switch mutation boundary

E11 keeps template switching presentation-only:

- storefront Page Schema drafts: allowed
- products: no mutation
- variants: no mutation
- customers: no mutation
- orders: no mutation
- B2B accounts: no mutation
- pricing: no mutation
- inventory: no mutation
- offers: no mutation

## Reusable professional storefront components

Wave 4 adds registry-driven components:

- `professional.hero`
- `professional.category-matrix`
- `professional.quick-search`
- `professional.product-list`
- `professional.use-case-nav`
- `professional.partner-cta`
- `professional.bulk-order`
- `professional.technical-support`
- `professional.reorder`
- `professional.price-panel`
- `professional.quantity-order`
- `professional.rfq-panel`

The registry extends the shared Wave 2 structured-product component stack. The renderer remains component-key + version driven; no `industrial.tool-depot` conditional branch is added to the runtime.

## Golden #4 Tool Depot

Template identity:

- key: `industrial.tool-depot`
- version: `1`
- minimum plan: `alap`
- demo namespace: `industrial-tool-depot`

The template itself is available in Alap. Advanced B2B presentation is conditional on real server-authoritative partner/commercial state rather than an artificial template paywall.

### Visual DNA

Tool Depot direction:

- professional supply-store / specialist commerce;
- bright white background;
- light industrial-grey surfaces;
- graphite text;
- restrained safety-orange or merchant-brand accent;
- optional dark navy support tone;
- strong sans-serif display typography;
- compact data presentation;
- optional monospaced SKU/cikkszám treatment;
- professional workshop and product-first imagery;
- denser than lifestyle commerce, but not cluttered.

Explicitly excluded:

- yellow/black DIY-store cliché;
- dark gamer-tech aesthetic;
- lifestyle-photo-dominant commerce;
- fabricated partner-price or stock claims.

## Approved Home composition

The Page Schema metadata locks this order:

1. Professional Hero
2. Category Matrix
3. Quick Product Search
4. Popular Professional Products
5. Industry/Use Case Navigation
6. B2B Partner CTA
7. Bulk Order Feature
8. Technical Support
9. Reorder
10. Footer

## Page package

Tool Depot ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

All 14 presets pass the Alap Template Capability Gate.

## Catalog and search

Tool Depot supports presentation bindings for:

- category / use-case navigation;
- product-name search;
- SKU / cikkszám search;
- stock evidence;
- net/gross display-price evidence;
- MOQ / order-multiple evidence;
- structured product information from E7.

E2 remains Product Discovery authority; E11 does not replace search/filter authority.

## Product page

Desktop/tablet:

- media/gallery: 7/12
- professional buybox: 5/12

Mobile:

- both reflow to 12/12

The buybox can present:

- product identity;
- SKU;
- server-supplied net/gross price;
- partner-price indicator only when supplied by authority;
- stock label;
- E7 key specifications;
- MOQ/order multiple;
- quantity control with client-hint semantics;
- purchase CTA binding;
- RFQ/offer surface.

Below the buybox:

- E7 grouped technical specifications;
- E7 technical documents;
- technical-support surface.

## Bulk order and reorder

Tool Depot includes presentation contracts for quick/bulk order and reorder. Neither path directly creates a trusted order from client-side state.

The final order path remains subject to common server checkout validation, including current:

- channel visibility;
- price/tax;
- stock;
- MOQ;
- order multiple;
- customer/partner authority.

## Engine boundaries

Tool Depot declares:

- E1 Runtime — consumed from Wave 0;
- E2 Product Discovery — binding contract only;
- E7 Compare & Spec Engine — consumed for technical product data/documents;
- E11 Professional / B2B Experience v1 — implemented here;
- E13 Checkout — final checkout authority / binding contract.

Checkout stays provider-neutral. No K&H/vPOS credential, merchant id or payment secret is embedded in Tool Depot Page Schema.

## Demo-content safety

The Tool Depot demo namespace is `industrial-tool-depot`.

Demo fixtures deliberately do not contain fabricated:

- partner prices;
- reseller prices;
- contract prices;
- stock quantities.

Commercial B2B evidence must come from runtime server bindings, not seeded marketing claims.

## Regression coverage

Wave 4 adds evidence for:

- E11 engine identity and server-authority list;
- server-only professional product snapshots;
- price/tax/stock evidence preservation;
- hidden-channel fail-closed behavior;
- MOQ/order-multiple validation;
- approved-partner conditional experience;
- client-only quantity hints + server revalidation;
- offer acceptance eligibility and safe URLs;
- reorder server revalidation;
- SKU normalization;
- presentation-only template-switch mutation boundary;
- Tool Depot visual/engine identity;
- 14 Alap-compatible Page Schema presets;
- approved Home ordering;
- Home runtime rendering;
- 7/12 + 5/12 product layout and 12/12 mobile reflow;
- E7 specs and technical documents;
- E11 price/quantity/RFQ components;
- demo-content commercial-claim safety;
- provider-neutral E13 checkout.

## Current implementation CI evidence

Implementation/fix head before documentation:

`988725f5ea201fa84aadb0a9a66dc984388d4295`

GitHub CI #1976 / Actions run `34228437418`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **194 files / 1276 tests**
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 4 introduces no baseline migration

Release manifest:

- version: `v24`
- SHA: `988725f5ea201fa84aadb0a9a66dc984388d4295`
- environment: `ci`
- release hash: `97ee826ad18589dd2b4398acc3703e0d5aeb6b334d5b11d3ea61b7c398386537`

The documentation commit must also pass full current-head CI before Wave 4 is considered documentation-complete.

## Diff evidence

Compared with Wave 3 final head, Wave 4 is three commits ahead and changes exactly nine files, all Wave 4-specific additions:

- E11 professional/B2B read-model engine;
- professional component registry;
- professional renderer registry;
- Tool Depot template package;
- two regression test files;
- three deterministic local demo SVGs.

No SQL migration, customer-baseline file or pre-existing business-authority implementation is modified by the Wave 4 diff.

## Explicit non-scope

Wave 4 does not implement:

- enterprise procurement portal;
- EDI;
- SAP connector;
- tender/quote negotiation workflow;
- credit-limit engine;
- approval hierarchy;
- punchout procurement;
- new B2B persistence authority;
- new pricing/tax authority;
- new inventory authority;
- new offer-acceptance authority;
- Visual Builder drag/drop UI;
- live storefront route switch;
- SQL/customer-baseline migration;
- production/shared-staging mutation;
- production Vercel deployment;
- payment/K&H/vPOS changes;
- Water-K tenant status change.

## Release discipline

Wave 4 must remain a stacked Draft PR on Wave 3 / PR #124.

A green Wave 4 CI authorizes code-level acceptance of this implementation block only. It does not authorize production rollout and must not bypass the PR #115 → #117 → #122 → #123 → #124 dependency chain.
