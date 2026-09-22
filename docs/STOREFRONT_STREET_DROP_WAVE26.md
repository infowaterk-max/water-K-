# Storefront Scale-out Wave 26 — Street Drop Re-acceptance

## Scope

Wave 26 does **not** create a second Street Drop template. `fashion.street-drop` v1 was already implemented earlier in the stacked scale-out chain and is inherited by the current fashion-family baseline.

Wave 26 therefore performs a **current-baseline re-acceptance** of that inherited implementation against the now-complete three-direction fashion portfolio:

1. Monarche — balanced mainstream premium fashion retail
2. Editorial Atelier / Atelier Nova — asymmetric campaign-led editorial fashion
3. Street Drop — aggressive but readable streetwear / sneaker / drop culture

Branch:

`feature/storefront-street-drop-wave26`

Exact base:

- base branch: `feature/storefront-editorial-atelier-wave25`
- base SHA: `184edbe37a9b5a3ccbcf8fd3ea768458ede088b1`
- base PR: #148

Accepted implementation/re-acceptance head:

`3934d8b17a0f5f53197f6f8bc23ecc65311b2670`

## Why this is a re-acceptance wave

A historical branch already exists:

`feature/storefront-street-drop-wave9`

with Draft PR #130.

That implementation is already inherited through the later stacked chain, so duplicating its Page Schema, template key, demo namespace, product pages or checkout would create an invalid second implementation of the same template.

Wave 26 instead adds a current-family acceptance contract plus fresh regression evidence on top of the current Wave 25 HEAD.

## Approved Street Drop direction

The accepted direction remains:

- aggressive streetwear / sneaker identity;
- street workout;
- skate;
- roller;
- BMX;
- urban community / ride culture;
- black + off-white visual foundation;
- merchant-replaceable neon accent;
- characterful display typography for headlines only;
- clean sans-serif UI typography;
- high-energy Home;
- ordered Catalog and Product pages;
- restrained Cart and Checkout.

Typography contract:

- display typography must remain readable;
- display treatment is headline-only, not body/UI chrome;
- interface copy remains clean sans;
- Builder font choice must be actually available, legally usable and support Hungarian characters.

Explicit exclusions:

- unreadable graffiti typography;
- gamer/RGB visual language;
- Monarche mainstream premium clone;
- Editorial Atelier luxury-magazine clone;
- baked-in marketing copy;
- fake stock scarcity;
- fake countdown urgency.

## Fashion-family separation

### Monarche

Street Drop must not inherit Monarche's balanced, polished, mainstream premium retail rhythm.

### Editorial Atelier

Street Drop must not inherit Atelier's luxury editorial / fashion-magazine composition, serif-led tone or restrained campaign pacing.

### Street Drop

Own position:

`aggressive-readable-urban-drop-commerce`

The page may be visually energetic, but commerce controls and service pages remain ordered and readable.

## Builder compatibility

The inherited Street Drop Home already keeps hero and Drop Alert content as separate Page Schema nodes.

Hero marketing layers:

- badge
- headline
- copy
- primary CTA
- secondary CTA
- image

Drop Alert layers:

- eyebrow
- headline
- copy
- CTA

Responsive editing contract:

- Desktop
- Tablet
- Mobile

Image rule:

business copy, price, promo and CTA must never be baked into image assets.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

## Exact inherited Home order

1. Drop Hero
2. Release Bar
3. Shop the Drop
4. Categories
5. Limited Stock
6. Street Story
7. New Arrivals
8. Community Journal
9. Drop Alert
10. Footer

This remains intentionally different from both Monarche and Editorial Atelier.

## Authority contract

Wave 26 introduces no new authority engine.

The inherited Street Drop engine contract remains the implementation authority for the current v1 template.

Critical fail-closed rules:

- scarcity is `inventory-binding-only`;
- release status must come from authoritative binding;
- no fake countdown;
- no fake limited-stock count;
- no template-specific drop scheduler;
- no template-specific inventory/scarcity engine;
- checkout remains shared provider-neutral E13.

If a future reusable drop/release engine is added, Street Drop must compose with that shared engine rather than owning a one-off implementation.

## Alap compatibility

The inherited package continues to provide all 14 Alap-compatible Page Schema presets:

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

`fashion-street-drop`

Installation remains draft-only and cannot mutate:

- products
- variants
- customers
- orders
- B2B records.

## Existing deterministic media

The inherited implementation already contains:

- `/storefront-demo/street-drop/hero.svg`
- `/storefront-demo/street-drop/category.svg`
- `/storefront-demo/street-drop/story.svg`

No new duplicate media set is introduced in Wave 26.

## Wave 26 regression contract

New files:

- `src/lib/builder/templates/street-drop-wave26-acceptance.ts`
- `tests/storefront-street-drop-wave26-reacceptance.test.tsx`

The new regression contract locks:

- reuse of the inherited `fashion.street-drop` implementation;
- no second template implementation;
- approved audience and visual direction;
- black/off-white + merchant-neon foundation;
- headline-only readable display typography;
- clean sans UI;
- Builder/font requirements;
- separation from Monarche and Editorial Atelier;
- exact Home order;
- separate hero/Drop Alert Builder layers;
- responsive Desktop/Tablet/Mobile contract;
- no baked marketing copy requirement;
- inventory-only scarcity;
- authoritative release-status binding;
- no fake countdown;
- no fake limited stock;
- no template-specific scheduler or inventory authority;
- all 14 Alap pages remain valid;
- draft-only namespaced install;
- provider-neutral E13 checkout.

## Accepted implementation CI

Accepted implementation/re-acceptance head:

`3934d8b17a0f5f53197f6f8bc23ecc65311b2670`

GitHub **CI #2095 / Actions run `34341862489`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 unique test files / 1353 tests PASS**;
- 1353 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 26 introduces no migration.

Implementation release manifest:

- version: `v24`;
- SHA: `3934d8b17a0f5f53197f6f8bc23ecc65311b2670`;
- ref: `feature/storefront-street-drop-wave26`;
- environment: `ci`;
- release hash: `f0f53f39cffd67e1cda9c8deb3e693c8bad8009d1b0e23e741690152dc8557f2`.

## Implementation diff vs Wave 25 final head

Compared with `184edbe37a9b5a3ccbcf8fd3ea768458ede088b1`:

- 2 commits ahead;
- 0 behind;
- 2 added files;
- 168 additions;
- 0 deletions.

Files:

- `src/lib/builder/templates/street-drop-wave26-acceptance.ts`
- `tests/storefront-street-drop-wave26-reacceptance.test.tsx`

The inherited `src/lib/builder/templates/street-drop.ts` is deliberately **not duplicated or rewritten** by the implementation diff.

No SQL/customer-baseline, pricing, inventory, order, payment, deployment or shared runtime authority file is changed.

## Explicit no-deploy rule

Wave 26 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

GitHub `production build` remains compilation/evidence only.

## Closure rule

Wave 26 closes only when:

1. this documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Wave 25 final head;
4. a Draft PR is stacked directly on `feature/storefront-editorial-atelier-wave25` / PR #148;
5. that PR is open, not merged and mergeable/clean.
