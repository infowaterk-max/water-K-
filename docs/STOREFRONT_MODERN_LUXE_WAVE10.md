# Storefront Scale-out Wave 10 — Modern Luxe

## Purpose

Wave 10 implements the accepted **Modern Luxe** storefront direction as the next post-Golden scale-out template and introduces a small reusable visual-layer runtime needed to reproduce approved layered designs more faithfully.

Template key:

`jewelry.modern-luxe`

Base:

`feature/storefront-street-drop-wave9`

Base final head:

`3d17f1d8a67debc53caa11b100ee03a2eea4e270`

Wave 10 remains a stacked Draft implementation. It introduces no SQL migration, production/shared-staging mutation, live route switch, payment change or Water-K status change.

## Accepted category and visual direction

Modern Luxe belongs to the Jewelry & Accessories family.

Primary commerce categories:

- Ékszerek
- Órák
- Táskák
- Napszemüvegek
- Kiegészítők

Accepted visual character:

- premium modern jewelry/accessories commerce;
- spacious, refined editorial rhythm;
- ivory background;
- champagne-gold accent;
- black typography;
- large close-up jewelry/watch/bag/accessory imagery;
- elegant editorial serif display + clean sans interface;
- deliberately airy section separation.

Explicit exclusions:

- streetwear/skate/graffiti/neon language;
- crowded Home layout;
- hero-carousel next/previous treatment;
- baked marketing copy inside images;
- excessive gold treatment.

The implementation therefore follows the final accepted sparse revision rather than the earlier crowded/carousel-style direction.

## Pixel-fidelity architecture

The product goal is to reproduce approved template references as closely as possible, including layout, hierarchy, proportion, spacing, typography and visual layering.

Wave 10 improves the runtime architecture for that goal by introducing reusable layered visual primitives. This commit is a **code-level structural implementation** of the accepted design contract; it is not claimed as a screenshot-based pixel-diff acceptance proof.

Literal pixel-level acceptance still requires rendering the template against the approved visual reference at the later visual acceptance stage.

## Shared visual-layer primitives

New shared component contract:

`shoporation.storefront-visual-layers.v1`

Components:

- `visual.layered-canvas`
- `visual.layer`

The registry extends the existing structured-product component stack and the renderer remains component-key/version driven.

The primitives intentionally use safe enumerated layout controls instead of arbitrary CSS injection.

### Layered canvas controls

- height preset;
- tone;
- radius.

### Layer controls

- safe position preset;
- X/Y offset presets;
- z-index;
- width preset;
- tone/scrim preset;
- padding preset;
- opacity;
- pointer-events mode.

Supported positional presets include full, corner, center-left/right and centered placement.

Supported visual tones include transparent, soft/strong scrim, surface, accent and primary.

These shared primitives can be reused by subsequent accepted templates that need image + overlay + decorative + content layering without introducing template-name conditionals.

## Independent Builder layers

The accepted Modern Luxe hero is not represented as one monolithic hardcoded hero component.

The Page Schema contains independent layers for:

1. image;
2. overlay;
3. decoration;
4. badge;
5. title;
6. subtitle;
7. CTA.

Locked contract:

`hero-image-title-subtitle-cta-badge-overlay-decoration-separate-editable-layers`

Each visible marketing element therefore remains separately configurable/bindable for the future Builder.

No marketing copy is baked into the deterministic local demo imagery.

## Spacing contract

Modern Luxe locks the previously accepted spacing-control model:

Presets:

- Narrow
- Normal
- Airy
- Custom

Default:

- Airy

Builder-facing control concepts:

- section gap;
- inner padding;
- column gap.

Responsive scopes:

- desktop;
- tablet;
- mobile.

The current template metadata records this contract so the later actual Visual Builder can expose these controls without changing template semantics.

## Home composition

Final sparse Home order:

1. Layered Luxe Hero
2. Category Edit
3. Signature Selection
4. Ajándéknak választva
5. Brand Story
6. Footer

Hero navigation is explicitly:

`none`

The previously rejected next/previous carousel treatment is not part of the final Home contract.

## Page package

Modern Luxe ships 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Brand Story
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan:

`alap`

Demo namespace:

`jewelry-modern-luxe`

## Product page

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- both 12/12

The product page reuses common commerce components and generic option selection so the same template can support jewelry, watches, bags, sunglasses and accessories without introducing a category-specific product authority.

Unsafe option URLs and unavailable-option disabling remain inherited from the shared commerce runtime.

## Engine boundary

Required shared engines:

- E1 Runtime
- E2 Product Discovery
- E13 Checkout

Optional reusable capabilities:

- E7 structured material/size/spec data
- Recommendations

Modern Luxe introduces no new product, pricing, inventory, customer, order or payment authority.

Checkout remains provider-neutral and contains no K&H/vPOS credential, merchant identifier or payment secret.

## Demo content

Namespaced demo fixtures:

- collection `jewelry`
- collection `watches`
- product `champagne-ring`
- content `brand-story`

Deterministic local demo media:

- `public/storefront-demo/modern-luxe/hero.svg`
- `gift.svg`
- `story.svg`
- `decor.svg`

The media contains abstract visual composition only; no editable marketing wording is embedded in the files.

## Template-install safety

Template installation remains draft-only/presentation-only.

Existing mutation boundary remains authoritative:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

No database migration is added.

## Regression coverage

Wave 10 adds evidence for:

- reusable visual-layer primitives;
- independent image/overlay/content layer rendering;
- accepted Jewelry & Accessories categories;
- ivory/champagne-gold/black visual contract;
- rejected crowded/carousel direction excluded;
- sparse Home order;
- no hero next/prev navigation;
- spacing contract metadata;
- seven independent hero visual/marketing layers;
- merchant-bound hero content;
- 14 Alap-compatible Page Schema presets;
- generic multi-category option selector;
- 7/12 + 5/12 desktop/tablet product layout;
- 12/12 mobile reflow;
- unavailable option visibility/disabled behavior;
- unsafe option URL rejection;
- draft-only namespaced template installation;
- provider-neutral E13 checkout.

## Implementation diff

Compared with Street Drop final head `3d17f1d8a67debc53caa11b100ee03a2eea4e270`, implementation head `c2148252457a76dc677d2d15b87904d5a3ebba64` is exactly one commit ahead and adds 9 files / 0 deletions:

- shared visual-layer registry;
- shared visual-layer renderer;
- Modern Luxe template package;
- visual-layer regression test;
- Modern Luxe regression test;
- four local demo SVGs.

No pre-existing commerce-authority file or SQL/customer-baseline file is modified.

## Implementation CI evidence

Implementation head:

`c2148252457a76dc677d2d15b87904d5a3ebba64`

GitHub CI #2010 / Actions run `34247682792`: **SUCCESS**.

Verified:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **200 test files / 1338 tests**
- TypeScript: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 10 introduces no baseline migration

Implementation release manifest:

- version: `v24`
- SHA: `c2148252457a76dc677d2d15b87904d5a3ebba64`
- ref: `feature/storefront-modern-luxe-wave10`
- environment: `ci`
- release hash: `a7ae15b899c87c91c844364c816e5d00d6d43e51dda6d5348ad7286969ce3069`

The production build emitted only already-known non-blocking Supabase Edge-runtime and autoprefixer warnings.

## Explicit non-scope

Wave 10 does not implement:

- the actual Visual Builder drag/drop editor;
- arbitrary user-authored CSS positioning;
- screenshot/pixel-diff acceptance tooling;
- a new jewelry product authority;
- new pricing/inventory/order engines;
- SQL/customer-baseline migration;
- live storefront route switch;
- production/shared-staging mutation;
- production deployment;
- payment/K&H/vPOS changes;
- Water-K tenant status change.

## Closure rule

Wave 10 is documentation-complete only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Street Drop / PR #130 and verified mergeable.
