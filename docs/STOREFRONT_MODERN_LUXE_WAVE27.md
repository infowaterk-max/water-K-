# Storefront Scale-out Wave 27 — Modern Luxe Re-acceptance

## Scope

Wave 27 does **not** create a second Modern Luxe template. `jewelry.modern-luxe` v1 was already implemented earlier in the stacked scale-out chain as Wave 10 and is inherited by the current baseline.

Wave 27 performs a **current-baseline re-acceptance** against the now-established Jewelry & Accessories three-direction family:

1. Modern Luxe — modern, spacious, premium luxury retail
2. Heritage Atelier — craftsmanship/provenance/heritage story-led luxury
3. Statement Lab — contemporary material/spec gallery and object lab

Branch:

`feature/storefront-modern-luxe-wave27`

Exact base:

- base branch: `feature/storefront-street-drop-wave26`
- base SHA: `e003ddbc4481a5a38a5d4eb2add6d68a1765bb73`
- base PR: #149

Accepted implementation/re-acceptance head:

`9ac35f4cb06fafb40f4c542479e7fc51d81f315a`

## Why this is a re-acceptance wave

Historical implementation already exists:

`feature/storefront-modern-luxe-wave10`

The implementation is inherited through the stacked chain, including the shared visual-layer primitives introduced with the original Modern Luxe work. Duplicating its Page Schema, template key, demo namespace, media or visual runtime would be incorrect.

Wave 27 therefore adds a current-family acceptance contract and fresh regression evidence rather than a second template implementation.

## Accepted visual direction

Primary categories:

- Ékszerek
- Órák
- Táskák
- Napszemüvegek
- Kiegészítők

Current accepted visual character:

- premium modern jewelry/accessories commerce;
- spacious editorial luxury;
- ivory background;
- champagne-gold accent;
- black typography;
- large close-up jewelry/watch/bag/accessory imagery;
- elegant editorial serif display typography;
- clean sans-serif interface typography;
- airy separated section rhythm.

Typography requirements recorded by Wave 27:

- Builder-available;
- legally usable;
- Hungarian-character support;
- display treatment remains headline-oriented;
- UI remains clean sans-serif.

Explicit exclusions inherited and re-accepted:

- streetwear / skate / graffiti / neon language;
- crowded Home layout;
- hero next/previous carousel treatment;
- baked marketing copy in imagery;
- overloaded gold treatment.

## Jewelry-family separation

### Modern Luxe

Own position:

`premium-modern-spacious-editorial-luxury-retail`

Modern Luxe is commerce-first premium luxury with generous whitespace and layered campaign presentation.

### Heritage Atelier

Modern Luxe must not become craftsmanship/provenance/heritage-story-led. Heritage Atelier owns that direction and its E10 story/provenance emphasis.

### Statement Lab

Modern Luxe must not become a material/spec laboratory or object-comparison gallery. Statement Lab owns that direction and its required E7 structured-product/compare emphasis.

## Builder compatibility

The inherited Modern Luxe hero remains implemented with shared reusable visual primitives:

- `visual.layered-canvas`
- `visual.layer`

Independent hero layers:

1. image
2. overlay
3. decoration
4. badge
5. title
6. subtitle
7. CTA

Locked inherited layer contract:

`hero-image-title-subtitle-cta-badge-overlay-decoration-separate-editable-layers`

Wave 27 re-accepts the spacing contract:

Presets:

- Narrow
- Normal
- Airy
- Custom

Default:

- Airy

Controls:

- section gap
- inner padding
- column gap

Responsive scopes:

- Desktop
- Tablet
- Mobile

Image rule:

business copy, price, promotion and CTA must never be baked into image assets.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

## Exact inherited Home order

1. Layered Luxe Hero
2. Category Edit
3. Signature Selection
4. Ajándéknak választva
5. Brand Story
6. Footer

Hero navigation remains explicitly:

`none`

The previously rejected crowded carousel/next-prev direction remains excluded.

## Authority contract

No new jewelry or commerce authority engine is introduced.

Inherited required engines remain:

- E1 Runtime
- E2 Product Discovery
- E13 Checkout

Optional reusable capabilities remain:

- E7 structured material/size/spec data
- shared Recommendations

Wave 27 explicitly locks fail-closed truth boundaries:

- price = pricing binding only;
- stock = inventory binding only;
- variants = variant binding only;
- material/size/spec facts = E7 or authoritative product binding only when supplied;
- recommendations = shared recommendation surface only;
- no template-specific jewelry product authority;
- no fake material claims;
- no fake scarcity;
- checkout remains provider-neutral E13.

## 3D / AR capability boundary

3D/AR is **not required by Modern Luxe v1**.

It remains a possible future shared Pro/Add-on capability whose final packaging is deferred. Wave 27 therefore does not introduce a Modern Luxe-specific 3D/AR engine.

If such capability is implemented later, Modern Luxe may compose with the shared capability without changing product truth ownership.

## Alap compatibility

The inherited package continues to ship all 14 Alap-compatible Page Schema presets:

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

Demo namespace remains:

`jewelry-modern-luxe`

Installation remains draft-only and cannot mutate:

- products
- variants
- customers
- orders
- B2B records.

## Wave 27 regression contract

New implementation/evidence files:

- `src/lib/builder/templates/modern-luxe-wave27-acceptance.ts`
- `tests/storefront-modern-luxe-wave27-reacceptance.test.tsx`

The current-baseline regression locks:

- reuse of inherited `jewelry.modern-luxe` v1;
- no duplicate template;
- exact categories and visual direction;
- Modern Luxe / Heritage Atelier / Statement Lab distinctness;
- merchant-adjustable accent;
- readable/legal/Hungarian-capable Builder font boundary;
- exact Home order;
- no carousel navigation;
- seven independent hero layers;
- Narrow/Normal/Airy/Custom spacing contract;
- Desktop/Tablet/Mobile responsive controls;
- pricing/inventory/variant authority boundaries;
- E7-only supplied structured facts;
- no fake material claims or scarcity;
- no template-local jewelry authority;
- 3D/AR not required by v1 and not template-local;
- all 14 Alap pages remain valid;
- draft-only namespaced installation;
- provider-neutral E13 checkout.

## Accepted implementation CI

Accepted implementation/re-acceptance head:

`9ac35f4cb06fafb40f4c542479e7fc51d81f315a`

GitHub **CI #2099 / Actions run `34342963797`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 unique test files / 1354 tests PASS**;
- 1354 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 27 introduces no migration.

Implementation release manifest:

- version: `v24`;
- SHA: `9ac35f4cb06fafb40f4c542479e7fc51d81f315a`;
- ref: `feature/storefront-modern-luxe-wave27`;
- environment: `ci`;
- release hash: `ce7d211fa2626dfa9105c796b343ece4d3a5762ee8c049cdd4de1280f38f1df0`.

## Implementation diff vs Wave 26 final head

Compared with `e003ddbc4481a5a38a5d4eb2add6d68a1765bb73` before this documentation commit:

- 2 commits ahead;
- 0 behind;
- 2 added files;
- 184 additions;
- 0 deletions.

No SQL/customer-baseline, pricing, inventory, order, payment, deployment or shared runtime authority file is modified.

## Explicit no-deploy rule

Wave 27 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

GitHub `production build` remains compilation/evidence only.

## Closure rule

Wave 27 closes only when:

1. this documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Wave 26 final head;
4. a Draft PR is stacked directly on `feature/storefront-street-drop-wave26` / PR #149;
5. that PR is open, not merged and mergeable/clean.
