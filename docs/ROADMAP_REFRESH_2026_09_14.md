# Shoperation — Refreshed Launch Roadmap (2026-09-14)

Status: canonical sequencing update before the next development block.

## Verified baseline

- Production `main`: `74f4a1b17cb9775d3ea228f76b4aaff8c1b4696c`.
- Playroom v20 consolidation: Draft PR #343, head `428ff9f963c4eeebda01a2bf5011bb12f9675402`, exact-head CI and 14-page desktop screenshot QA green, not merged and not deployed.
- The accepted storefront portfolio target remains **42 genuinely distinct, launch-quality designs**.
- The source-controlled catalog currently contains 24 merchant-facing technical packages, but **package existence is not launch-quality acceptance**. At this checkpoint only **Playroom** is accepted as the reference-quality template family. Therefore the launch-quality portfolio gap is **41 templates**: the existing non-Playroom packages must be rebuilt/reworked to the accepted quality bar, and the still-missing designs must be implemented as real packages. Missing or inadequate entries must never be counted as finished merely because a technical package exists.
- Page Schema, Storefront Runtime, draft/preview/publish/rollback, Visual Builder, responsive inheritance, Global Styles, Presets, Saved Blocks/Global Elements, Alap/Pro entitlement gates and the shared Special Commerce engines remain the existing authorities.

## Canonical launch principles

1. Shared commerce capability first; template integration second. No feature may be implemented as a Playroom-only commerce engine if it belongs to every storefront.
2. Every storefront template must support physical products, digital/downloadable products, product documents and post-purchase customer documents. A merchant who does not use a capability simply gets no related storefront/account surface.
3. Purchased digital assets, product documents and customer/order documents are **three separate authorities**. Public/manual product files, purchase-protected digital goods and private post-purchase records such as invoices or warranty letters must never be collapsed into one entitlement model even if the customer sees them in one document center.
4. Alap and Pro use the same visual template family. Pro means additional entitled capabilities, not a second skin.
5. Add-ons/capabilities inherit the current live storefront design system and appear at semantic insertion points where merchants and shoppers naturally expect them.
6. Template version increments represent actual factory Page Schema/composition/schema/migration changes. A backward-compatible shared engine improvement must not force `v21`, `v22`, ... clones.
7. No `main` merge or production deployment before the exact-head acceptance gate of the current block and explicit Product Owner approval.
8. **Playroom is the current visual/structural launch-quality benchmark.** Existing non-Playroom template packages do not count as finished merely because they compile, render or previously passed technical acceptance; each must earn fresh visual/UX/Builder acceptance against the current standard.

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

## A2 — Customer Documents + Product Documents / Attachments

Provide one coherent customer-facing document center while keeping post-purchase order documents and product documents separate from paid digital assets and separate from each other.

### A2.1 — Post-purchase Customer / Order Documents

Required scope:

- private, tenant-scoped document association to a canonical order;
- document types including invoice/invoice copy, warranty letter, certificate, service record, merchant attachment and other order-related files;
- merchant upload/manage/revoke workflow from the order administration surface;
- private object storage and short-lived authorized download delivery;
- customer ownership check derived from canonical order ownership, never from a client-supplied customer identity;
- account `Documents and downloads` surface combining discoverability without collapsing authorities;
- existing invoicing provider `invoice_url` remains the canonical generated-invoice source and should not be duplicated into private storage without a reason;
- merchant-uploaded documents are not automatically revoked merely because a digital entitlement is refunded; they have their own retention/revocation lifecycle;
- download audit/evidence and bounded abuse controls;
- no permanent public document URL for private merchant-uploaded order files;
- migration + customer-baseline + Fresh Install parity.

### A2.2 — Product Documents / Attachments

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
- never reuse paid digital-download entitlement or private order-document ownership as the product-document model.

## A3 — Shared Storefront + Builder Integration

Expose A1/A2 through the common Page Schema/runtime so all current and future templates inherit the capability.

Required surfaces:

- Product: fulfillment/download information, purchase-delivery expectation, Product Documents block;
- Cart: line-level digital/physical fulfillment cues without duplicating cart authority;
- Checkout: pure-digital, physical and mixed fulfillment composition;
- Account / order detail: `Documents and downloads` with distinct Digital content and Order documents sections;
- order confirmation / post-purchase surfaces: authorized digital-access and document-center guidance;
- Builder component registry, renderer registry, semantic contexts, Presets and capability discovery;
- Global Styles/live-theme inheritance;
- empty/loading/error/locked/revoked states;
- no template-local digital-commerce or document business authority.

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
- product-document storefront acceptance;
- customer document-center acceptance with invoice + merchant-uploaded warranty/document scenario.

## A5 — Playroom Responsive Completion

The desktop family is accepted; responsive launch acceptance remains required.

- all 14 pages at Tablet;
- all 14 pages at Mobile;
- Product, Cart and Checkout mobile task flow;
- digital/physical/mixed checkout mobile states;
- Account Documents and downloads mobile surface;
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

# Phase B — Complete / rebuild the remaining 41 launch-quality templates

## B0 — Guarded Visual Section Library / Preset Gallery

Before the remaining template portfolio is scaled out, productize the existing canonical Section Preset mechanism into a merchant-facing visual library. This is **not** a free-form HTML/page-builder escape hatch and it does not create another renderer, document model or responsive authority.

Product direction:

- visual category browser with searchable/filterable preview cards for reusable compositions such as Hero, CTA, editorial, product discovery, testimonials, brands, FAQ, newsletter, contact and similar semantic sections;
- one-click insertion into the current Page Schema working copy, followed by ordinary Visual Builder editing;
- shared composition presets plus template-aware visual inheritance, with a smaller set of genuinely template-specific signature presets where the design requires it;
- merchant **Saved Blocks** remain a separate personal library; factory presets remain source-controlled and quality-gated;
- the existing 14 Page Presets remain page-level starting points; this library is section/component-level composition reuse and must not replace the page/template hierarchy.

### Non-negotiable safety boundary

Every factory block must remain inside every already accepted Builder/Template Factory rule:

- only registered Page Schema components/versions and declared parent-child contracts may be materialized;
- no raw HTML/JavaScript, arbitrary iframe/script/widget injection, hidden duplicate breakpoint DOM or template-local application code;
- no preset may become product, price, stock, order, payment, shipping, customer, entitlement or other business authority; commerce content stays bound to canonical engines;
- insertion must generate fresh stable node identities, preserve declared bindings/capability requirements, and pass the same server-side schema/capability validation as any other Builder edit;
- Desktop/Tablet/Mobile remain one document under the canonical responsive authority; a preset is not accepted if it relies on accidental desktop-to-mobile leakage or separate mobile markup;
- template design tokens and current-theme inheritance remain authoritative; a shared preset may adapt presentation, but it may not silently rewrite the merchant's global design system;
- protected/system surfaces and semantic insertion constraints remain protected.

### Structural and performance guard

The existing `STOREFRONT_TEMPLATE_PERFORMANCE_CONTRACT.md` is mandatory for every preset and for the page after insertion. Hard limits are **blocking**, not warnings. In particular, insertion must be refused when the resulting Page Schema would violate hard budgets for section count, total component nodes, tree depth, eager images, visual layers or style declarations.

Preset authoring must additionally obey these rules:

- no section may solve responsive layout by duplicating large hidden subtrees;
- below-fold media is lazy by default; only genuine LCP candidates may be eager;
- animation must remain bounded, compositing-first and reduced-motion aware;
- a preset cannot add a third-party runtime dependency or script merely to reproduce a visual effect;
- layered compositions must have bounded layer counts and section-local geometry;
- thumbnails/gallery browsing must not render dozens of live storefront runtimes at once; use lightweight/pre-generated preview assets or another bounded preview strategy;
- every preset family must be proven at true desktop, tablet and mobile and must pass schema, accessibility, state/data and runtime-performance gates before entering the factory library.

### Acceptance rule

A preset is factory-eligible only after:

`schema/capability validation -> responsive isolation proof -> structural performance budget -> runtime performance evidence -> Desktop/Tablet/Mobile visual proof -> accessibility/state checks -> Template Factory acceptance`.

If a visually attractive block can only pass by weakening a shared guard, raising a hard budget, adding duplicate DOM, or moving business truth into decorative configuration, the block is rejected rather than the platform rule being relaxed.

The launch target is **42 genuinely different, launch-quality visual designs**, not 42 aliases/reskins, not Alap/Pro duplication, and not a count of technically existing packages.

**Accepted launch-quality template families at this checkpoint: 1 — Playroom.**

**Remaining launch-quality work: 41 template families.** This consists of both:

- existing non-Playroom source packages that must be substantially reworked/rebuilt where needed to reach the Playroom-level quality bar; and
- template families/designs that do not yet have a genuine source-controlled implementation.

A previous technical acceptance, compile PASS, registry presence or old screenshot does **not** make a template launch-ready. Every one of the remaining 41 must pass the current product-quality gate independently.

For every remaining template family:

- genuinely distinct visual composition; no reskin-only acceptance;
- quality and information-density appropriate to its category rather than a generic storefront shell;
- all canonical page types required by the package contract;
- shared grid/Page Schema/Builder contract;
- full Builder editability of merchant-meaningful media/copy/CTA/layout without moving commerce truth into decorative content;
- Alap + Pro capability-aware behavior;
- shared Digital Commerce + Product Documents + Customer Order Documents support from Phase A;
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
- digital-commerce/download/product-document/order-document security and tenant-isolation regression;
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
2. **Customer / Order Document Vault + Product Documents**.
3. **Shared storefront/Builder integration** across all templates, with Playroom as the first full acceptance implementation.
4. **Playroom functional + responsive + accessibility/state/performance closure**.
5. **Playroom v20 final merge/release**.
6. **Guarded Visual Section Library / Preset Gallery foundation**, using the existing canonical Section Preset engine and hard Template Factory/performance guards.
7. **Remaining 41 template families — rebuild/rework/implement to the Playroom launch-quality bar**, reusing the completed shared capability platform and contributing only accepted reusable sections to the guarded library.
8. **Market Ready 1.0 final certification**.
9. **AI Support / Shoperation Knowledge** and post-launch premium expansion according to business priority.