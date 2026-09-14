# Shoperation — Refreshed Launch Roadmap (2026-09-14)

Status: canonical sequencing update before the next development block.

## Verified baseline

- Production `main`: `74f4a1b17cb9775d3ea228f76b4aaff8c1b4696c`.
- Playroom v20 consolidation: Draft PR #343, head `428ff9f963c4eeebda01a2bf5011bb12f9675402`, exact-head CI and 14-page desktop screenshot QA green, not merged and not deployed.
- The accepted storefront catalog target remains 42 concrete source-controlled designs. The current catalog contains 24 merchant-facing concrete packages; missing entries must never be fabricated.
- Page Schema, Storefront Runtime, draft/preview/publish/rollback, Visual Builder, responsive inheritance, Global Styles, Presets, Saved Blocks/Global Elements, Alap/Pro entitlement gates and the shared Special Commerce engines remain the existing authorities.

## Canonical launch principles

1. Shared commerce capability first; template integration second. No feature may be implemented as a Playroom-only commerce engine if it belongs to every storefront.
2. Every storefront template must support physical products, digital/downloadable products and product documents. A merchant who does not use a capability simply gets no related storefront surface.
3. Product documents and purchased digital assets are different authorities. Public/manual documents must never be confused with purchase-protected downloads.
4. Alap and Pro use the same visual template family. Pro means additional entitled capabilities, not a second skin.
5. Add-ons/capabilities inherit the current live storefront design system and appear at semantic insertion points where merchants and shoppers naturally expect them.
6. Template version increments represent actual factory Page Schema/composition/schema/migration changes. A backward-compatible shared engine improvement must not force `v21`, `v22`, ... clones.
7. No `main` merge or production deployment before the exact-head acceptance gate of the current block and explicit Product Owner approval.

---

# Phase A — Playroom / shared storefront launch blockers

These items must close before PR #343 may merge to `main`.

## A1 — Digital Commerce Foundation — NEXT BLOCK

Build one tenant-scoped, fail-closed shared Digital Commerce authority usable by every template.

Required scope:

- first-class product fulfillment type: physical / digital, with a forward-compatible contract for mixed fulfillment;
- product- or variant-bound private digital assets;
- secure private object storage, no permanent public asset URL;
- server-side purchase entitlement derived from canonical paid/order state;
- short-lived authorized download delivery;
- cancellation/refund/revocation rules bound to order authority;
- guest-purchase secure retrieval path without public download links;
- download audit/evidence and bounded abuse controls;
- mixed cart support: physical + digital in one order;
- pure-digital checkout skips physical shipping requirements and shipping fees instead of pretending to use pickup;
- only physical lines participate in shipping fulfillment;
- transactional communication can point the purchaser to authorized access without embedding an unlimited public URL;
- Product Intake/Admin support for digital product configuration and asset management;
- catalog/import/export representation that preserves digital fulfillment metadata;
- migration + customer-baseline + Fresh Install impact handled through the existing schema authority.

Acceptance scenarios:

1. one physical product;
2. one digital product;
3. mixed physical + digital basket;
4. authenticated digital buyer download;
5. secure guest digital buyer access;
6. unpaid/cancelled/refunded user cannot receive an unauthorized asset;
7. cross-tenant asset access fails closed;
8. repeated download remains within explicit policy/audit bounds.

## A2 — Product Documents / Attachments

Add a shared product-document authority separate from paid digital assets.

Required scope:

- product and, where justified, variant document association;
- document type/title/description/order/visibility metadata;
- supported examples: manual, datasheet, size guide, warranty information, compatibility sheet, installation guide and other merchant-provided files;
- merchant upload/manage/remove workflow;
- safe file-type/size contract and storage handling;
- public document visibility only when explicitly configured;
- optionally protected document visibility when product/account context requires it;
- storefront `Product documents` component using real document data;
- no document block when a product has no documents;
- never reuse paid digital-download entitlement as the document model.

## A3 — Shared Storefront + Builder Integration

Expose A1/A2 through the common Page Schema/runtime so all current and future templates inherit the capability.

Required surfaces:

- Product: fulfillment/download information, purchase-delivery expectation, Product Documents block;
- Cart: line-level digital/physical fulfillment cues without duplicating cart authority;
- Checkout: pure-digital, physical and mixed fulfillment composition;
- Account / order detail: `Downloads` / purchased digital assets surface;
- order confirmation / post-purchase surfaces: authorized digital-access guidance;
- Builder component registry, renderer registry, semantic contexts, Presets and capability discovery;
- Global Styles/live-theme inheritance;
- empty/loading/error/locked/revoked states;
- no template-local digital-commerce business authority.

Playroom factory acceptance must prove a downloadable game, a physical gaming product and a mixed basket. Other templates do not need factory sample digital products, but they must be capable of rendering the shared surfaces when such data exists.

## A4 — Playroom v20 Functional Acceptance

After A1–A3 are integrated into the Playroom branch:

- real v19 -> v20 draft-first upgrade acceptance;
- Contact Form real E2E ticket creation + validation/error/spam-path checks;
- Newsletter real E2E consent + duplicate/error/success checks;
- Alap vs Pro human Builder acceptance;
- contextual available/locked capability acceptance;
- add-on factory-fit acceptance using representative available Playroom capabilities;
- Global Styles mutation test;
- local style override -> Reset to inherited test;
- digital physical/mixed fulfillment E2E acceptance;
- product-document storefront acceptance.

## A5 — Playroom Responsive Completion

The desktop family is accepted; responsive launch acceptance remains required.

- all 14 pages at Tablet;
- all 14 pages at Mobile;
- Product, Cart and Checkout mobile task flow;
- digital/physical/mixed checkout mobile states;
- Account Downloads mobile surface;
- Contact Form and Newsletter mobile acceptance;
- no separate mobile Page Schema authority.

## A6 — Playroom Accessibility / State / Data / Performance Gate

- keyboard/focus/navigation acceptance;
- form labels, status/error announcements and contrast;
- checkout accordion semantics;
- locked capability accessibility;
- empty/loading/error states;
- long names, promotions, sold-out variants, empty search/cart, multi-line carts and realistic merchant data;
- representative Home/Product/Catalog/Checkout performance smoke gate;
- exact-head full CI, TypeScript, production build, security audit and required screenshot evidence.

## A7 — Playroom Release Gate

Only after A1–A6:

- reconcile PR #343 to the final exact head;
- final human visual review;
- Ready for Review;
- explicit Product Owner merge approval;
- merge to `main`;
- production deployment + `/api/health` and runtime smoke checks;
- real tenant upgrade/publish proof and rollback evidence where applicable.

---

# Phase B — Complete the 42-template portfolio

The catalog target is 42 genuinely different visual designs, not 42 aliases/reskins and not Alap/Pro duplication.

Current concrete merchant-facing package count: 24. Remaining design gap: 18.

For every remaining template family:

- genuinely distinct visual composition;
- all canonical page types required by the package contract;
- shared grid/Page Schema/Builder contract;
- Alap + Pro capability-aware behavior;
- shared Digital Commerce + Product Documents support from Phase A;
- Contact/Newsletter where appropriate through shared capability surfaces;
- category-relevant Special Commerce semantic integration;
- current-theme add-on inheritance and contextual discovery;
- Desktop/Tablet/Mobile acceptance;
- accessibility, representative state/data and performance checks;
- human screenshot acceptance before release.

Do not reimplement product, pricing, stock, checkout, payment, shipping, documents or digital-download authorities per template.

---

# Phase C — Shoperation Market Ready 1.0 certification

After the launch storefront portfolio/capability work is sufficiently complete, certify against the existing Market Ready / Block 24 authority instead of creating another release process.

Required closure includes:

- Alap / Pro / Add-on server-side entitlement proof;
- current customer baseline and genuine Fresh Install proof after all new sellable schema changes;
- neutral, non-Water-K pilot acceptance;
- critical checkout/payment/order/e-mail/inventory/returns regression;
- digital-commerce/download/document security and tenant-isolation regression;
- Vercel preview / release-manifest / exact-SHA evidence;
- Supabase Security Advisor review;
- leaked-password protection gate before public password-auth launch;
- staging -> GO/NO-GO -> production/rollback evidence;
- onboarding and minimum operator/customer documentation;
- no launch side effects that change Water-K plan/status/data unintentionally.

Commercial HUF pricing remains an explicit Product Owner/business decision; code must not invent it.

---

# Phase D — AI Support / Shoperation Knowledge

Accepted future product scope after the core launch blockers above unless separately reprioritized:

- structured incident knowledge: symptom -> diagnosis -> root cause -> attempted fixes -> failed approaches -> verified solution -> validation;
- OpenAI-backed support assistant over product documentation, Shoperation Knowledge and permissioned tenant state;
- recognize known symptoms and avoid repeating previously failed fixes;
- guided troubleshooting and root-cause suggestions;
- confidence/evidence handling and escalation path;
- strict tenant/RBAC/privacy boundaries;
- no autonomous commerce-state mutation without the existing authority/approval model.

This is separate from storefront template authority.

---

# Phase E — Post-launch / premium expansion

These remain valuable but do not block the current Playroom/Digital Commerce launch path unless Product Owner explicitly reprioritizes them:

- advanced 3D / AR;
- exploded product views;
- additional premium visual-commerce add-ons;
- public activation of AI Builder after controlled readiness;
- broader multilingual, multi-currency and multi-country commercialization work beyond the currently prepared architecture;
- additional marketplace / ERP integrations;
- deeper loyalty/referral/personalization capabilities.

All such capabilities must attach to the shared Page Schema/Builder/add-on contract and must not require cloning every existing template.

---

# Immediate execution order

1. **Digital Commerce Foundation**.
2. **Product Documents**.
3. **Shared storefront/Builder integration** across all templates, with Playroom as the first full acceptance implementation.
4. **Playroom functional + responsive + accessibility/state/performance closure**.
5. **Playroom v20 final merge/release**.
6. **Remaining 18 template designs**, reusing the completed shared capability platform.
7. **Market Ready 1.0 final certification**.
8. **AI Support / Shoperation Knowledge** and post-launch premium expansion according to business priority.
