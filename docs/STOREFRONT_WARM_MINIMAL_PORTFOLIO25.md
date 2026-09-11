# Storefront Portfolio 25 — Warm Minimal

## Classification

This is a **new concrete template package**, not a re-acceptance replay.

Recovery parent: `planning/storefront-42-portfolio-recovery@804fa2fb6774a5b86b8a531b5db1e58451665cdf`.

Portfolio transition required by this implementation:

`24 / 42 implemented → 25 / 42 implemented`

`18 remaining → 17 remaining`

## Accepted identity

- accepted product/design name: **Warm Minimal**
- category: **Otthon & Lakberendezés / Home & Living**
- package key: `home.warm-minimal`
- version: `1`
- demo namespace: `home-warm-minimal`
- minimum plan: `alap`

No earlier source-controlled canonical key for Warm Minimal exists in the repository. `home.warm-minimal` is therefore the first concrete package key assigned to the already accepted Warm Minimal name/direction; it is not represented as a recovered historical key.

## Accepted visual direction

Warm Minimal is intentionally quiet, warm and tactile:

- alabaster / oat / sand / putty / mushroom neutrals;
- walnut plus restrained muted sage / soft clay accents;
- linen, oak, boucle, travertine, ceramic and ribbed-glass material language;
- gentle diffused daylight;
- editorial home photography;
- modern grotesk or humanist sans typography;
- airy, low-contrast, non-techy interface character.

Explicit exclusions:

- cool-grey dominance;
- high-gloss luxury;
- neon / color-pop direction;
- cluttered marketplace density;
- rustic farmhouse;
- boho decor;
- overly glossy editorial styling.

This is deliberately distinct from Gallery Edit's object-as-art/gallery rhythm and Alpine Lodge's alpine boutique/editorial identity.

## Accepted Home journey

1. Warm Minimal Hero
2. Shop by Room
3. Material Palette
4. Shop the Room
5. Room Story
6. Quiet Essentials
7. Soft Layers
8. Editorial Journal / Home Notes
9. Newsletter / Footer CTA

Accepted room entry labels:

- Living room
- Bedroom
- Kitchen
- Bath
- Entry

Hero image, overlay, eyebrow, heading, copy, primary CTA and secondary CTA are separate shared Page Schema layers. Business copy and product truth are never baked into the image asset.

## PDP contract

- desktop/tablet: 7/12 gallery + 5/12 purchase panel;
- mobile: 12/12 + 12/12;
- authoritative product information and pricing/inventory bindings;
- material / finish selector using shared variant authority;
- supplied material/finish facts via E7-compatible key-specs;
- dimensions/care via shared specification groups;
- room-context gallery remains ordinary authoritative product media;
- shipping/returns trust copy remains merchant content;
- sticky purchase intent is recorded as a shared-runtime concern and must not create a Warm-Minimal-local sticky-buybox engine.

## Shared authority

Required full experience:

- E1 Runtime / Page Schema
- E2 Product Discovery
- E7 Structured Product / Spec truth
- E10 Editorial / Story
- E13 provider-neutral Checkout

Supporting shared capability:

- Recommendations

Warm Minimal must never own or invent material, finish, dimensions, care, price, stock, rating, variant, checkout, payment or order truth.

## Package

14 Alap-compatible responsive Page Schema presets:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Responsive modes: Desktop / Tablet / Mobile.

Installation remains draft-only and cannot mutate products, variants, customers, orders or B2B authority.

## Source changes

- new canonical package: `src/lib/builder/templates/warm-minimal.ts`
- catalog registration: `src/lib/builder/storefront-template-catalog.ts`
- deterministic text-free demo media under `public/storefront-demo/warm-minimal/`
- CI-executed acceptance: `tests/storefront-warm-minimal-template.test.ts`
- portfolio gate advances to 25/42 in `tests/storefront-42-portfolio-recovery.test.ts`

## Release boundary

This package is developed as a stacked Draft PR on the recovery gate. It does not authorize:

- merge to `main`;
- production deployment/promotion;
- Supabase production/staging/Fresh Install mutation;
- customer-baseline migration;
- Water-K tenant mutation;
- K&H/vPOS/payment authority change;
- unrelated Builder/Roadmap work;
- another replay/re-acceptance wave.

The next missing-template implementation may start only after this exact package passes current-head CI and must advance the portfolio from **25/42 to 26/42**.
