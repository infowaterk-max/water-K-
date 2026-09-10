# Roadmap Block 15 — Product Discovery, Guided Finder, Multi-Product Composer, Configurator & Compatibility

## Reconstructed canonical scope

Block 15 closes the previously accepted shared storefront discovery and decision-support family. It does not introduce a template-specific product source and it does not rebuild engines already delivered by the storefront scale-out waves.

Canonical family:

- **E2 Product Discovery** — structured catalog search/filtering, product/channel/sellable eligibility projection, deterministic ranking and explainable recommendation boosts;
- **E3 Guided Finder** — intent/questionnaire-driven recommendations over eligible discovery candidates;
- **E4 Multi-Product Composer** — multi-item composition/bundle intent with existing cart/price/stock revalidation;
- **E5 Product Configurator** — dependency-aware selection and composed-product intent;
- **E6 Compatibility Engine** — rule-based fitment/interface/protocol/constraint evaluation with server-authoritative final validation;
- **E7 Compare & Spec** — shared structured product specification, comparison and facet authority;
- **E8 Profile Context** — explicit customer/guest context used only as soft discovery ranking/personalization.

The engines remain deterministic and explainable and expose read-model/configuration contracts that can be consumed by the later Builder work without implementing that Builder here.

## Existing foundations reused

The canonical implementation deliberately reuses earlier shared foundations:

- E7 `shoporation.compare-spec-engine.v1` from the shared structured-product registry;
- E3 `shoporation.guided-finder.v1`;
- E4 `shoporation.multi-product-composer.v1`;
- E5 `shoporation.product-configurator.v1`;
- E6 `shoporation.compatibility-engine.v1`;
- E8 `shoporation.context-profile-engine.v1`;
- existing pricing, inventory, cart/checkout and catalog eligibility authorities;
- existing Builder Compatibility Foundation contracts only as a compatibility target.

Block 15 adds the missing canonical E2 `shoporation.product-discovery.v1` read-model engine and a family-level contract proving that E2–E8 remain one shared platform layer rather than template-specific parallel engines.

## E2 Product Discovery contract

E2 accepts already-authoritative product/variant/channel/sellable eligibility evidence. It never makes an inactive, hidden or non-sellable item eligible by itself.

Discovery provides:

- normalized text search across product labels, explicit search terms, category keys and resolved E7 structured values;
- OR-within / AND-across structured facet filtering using E7 facet keys;
- category filtering;
- bounded, explicit recommendation-signal boosts with human-readable reasons;
- stable deterministic tie-breaking;
- explicit exclusion evidence;
- E7-derived primitive attributes consumable by E3 Guided Finder;
- context attributes pass-through consumable by E8 soft ranking.

E2 does not own price, inventory mutation, cart, customer, order or catalog mutation authority.

## Explicit non-scope

Block 15 does **not** implement or advance:

- Roadmap Block 21 — Page Schema / Templates runtime implementation;
- Roadmap Block 22 — Visual Builder, drag-and-drop canvas or inline storefront editor;
- supplier feed/API synchronization;
- automatic catalog enrichment;
- marketplace bulk publishing;
- advanced PIM/ERP connectors;
- AI-generated product data;
- new payment, shipping, invoicing, pricing, inventory or checkout authority.

## Database / customer baseline

Block 15 is implemented entirely as shared pure/read-model contracts over existing tenant-scoped catalog data and existing storefront engine foundations. It adds **no database migration** and does not change `supabase/customer-baseline`.

Therefore the Block 14 genuine ordered `0001–0009` Fresh Install proof remains authoritative; its manifest must not be invalidated merely for this code-only block.

## Acceptance contract

Before merge:

- E2 unit/contract coverage must prove eligibility fail-closed behavior, E7 facet reuse, deterministic explainable ranking and stable exclusion evidence;
- a cross-engine test must prove E2 output can feed E3 Guided Finder and E8 Profile Context without a second attribute/catalog source;
- E2–E8 version identities and the Block 21/22/non-scope boundary must be regression-locked;
- normal customer-baseline guard, full test suite, typecheck, production build and repository CI must pass;
- preview deployment must be healthy;
- no production or staging database mutation is required.

After green gate, merge to `main`, then verify main CI, production Vercel READY state, `/api/health`, both Supabase projects and unchanged Water-K `pilot`/`pro` invariants.
