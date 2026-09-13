# Storefront Wave 53 – Gallery Edit Re-acceptance & Builder Hardening

## Canonical sequence reconstruction

Wave 53 is the repository-proven current replay of historical **Wave 34 / PR #194 – Gallery Edit Re-acceptance & Builder Hardening**.

The successor is reconstructed from repository history rather than inferred from numbering:

- original **Wave 14 / PR #137** introduced Alpine Lodge;
- original **Wave 15 / PR #138** introduced canonical `home.gallery-edit` v1 directly after Alpine Lodge;
- historical re-acceptance **Wave 33 / PR #189** re-accepted Alpine Lodge;
- historical re-acceptance **Wave 34 / PR #194** is stacked directly on `feature/storefront-alpine-lodge-wave33` at accepted Wave 33 HEAD `599dbb930e49fb2caa80be4c44edcec4425d78a1`;
- historical Wave 34 names `home.gallery-edit` v1 as its canonical template and names Table & Gift as the following direction;
- the current template catalog already registers `GALLERY_EDIT_TEMPLATE_PACKAGE` rather than requiring a new template slot;
- the accepted historical `gallery-edit.ts` blob at Wave 34 final HEAD and the inherited blob at current Wave 52 HEAD are byte-identical: `fe8c36d966340a7011fd88f8ea24950f1e2dac44`;
- there is no release checkpoint between historical Wave 33 and Wave 34.

Therefore the canonical successor of current Wave 52 is:

- current wave: **53**;
- name: **Gallery Edit Re-acceptance & Builder Hardening**;
- canonical template key: `home.gallery-edit`;
- template version: `1`;
- historical re-acceptance counterpart: **Wave 34 / PR #194**;
- original template counterpart: **Wave 15 / PR #138**;
- mode: current-baseline re-acceptance of an inherited implementation, not a new template.

## Exact stack boundary

Wave 53 is branched from exact Wave 52 HEAD:

`88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`

Branch:

`feature/storefront-gallery-edit-wave53`

Stacked Draft PR base:

`feature/storefront-alpine-lodge-wave52`

The Storefront stack is intentionally not rebased onto moving `main`.

## Read-only preflight snapshot

At Wave 53 start:

- GitHub `main`: `6238f1fcbc0732a7f0cfc9bf113bbe8e5a15956a`, an unrelated Product Intake sidebar merge;
- Wave 52 branch: exact `88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`;
- PR #251: open, Draft, unmerged and mergeable;
- Wave 52 CI run `34582900464` / #2736: SUCCESS;
- Vercel production deployment `dpl_2nnmf685WFx3jWCKwzR5eYhC92An`: READY, target `production`, exact unrelated `main` SHA `6238f1fcbc0732a7f0cfc9bf113bbe8e5a15956a`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `6238f1fcbc07`;
- Wave 52 preview `dpl_7pbWkYtEjqQobbtr258eSmme1B5u`: READY, target `null`, exact SHA `88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`;
- the Wave 52 public preview health endpoint remains Deployment Protection-bound and its historical 302 SSO result is not treated as an application 200 smoke;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- `Shoperation Fresh Install` / `istjjkdcvsvilrycqecd`: `INACTIVE`;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, products `1`, variants `3`, orders `8`, storefront pages `0`, storefront page revisions `0`.

The customer baseline manifest on both current Wave 52 and current `main` is the same blob `60b6705ec860849c563f6832460e3c7996f4e433`:

- status `ready`;
- `legacyMigrationReplay=false`;
- default plan `alap`;
- ordered baseline through `0017`;
- `freshInstallProofRequired=false`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

No environment, database, tenant or production mutation is authorized by this wave.

## Canonical Gallery Edit contract

Gallery Edit remains a contemporary interior/design concept-store × gallery, not a generic furniture marketplace.

Accepted visual DNA remains:

- chalk/off-white background;
- limestone-grey surfaces;
- graphite typography;
- a single restrained curatorial accent;
- editorial grotesk or refined-serif display direction;
- clean sans-serif interface typography;
- furniture, lighting, ceramics, textiles and objects presented as gallery pieces;
- large negative space;
- airy, precise gallery-scale spacing.

Accepted merchandising journey:

`edit → room or object type → material → object → story`

It remains materially distinct from both adjacent directions:

- Alpine Lodge: warm natural boutique-lodge, layer/material/use-context commerce;
- Table & Gift: occasion-, recipient- and gifting-first commerce.

Explicit exclusions remain busy marketplace composition, rustic farmhouse treatment, overloaded gold luxury, streetwear language, fabricated designer provenance, fabricated material claims and baked marketing copy.

The original Wave 15 evidence did not prove an exact recoverable historical screenshot/pixel reference. Wave 53 therefore does not invent one or claim pixel-diff acceptance; the canonical structural and visual contract remains authoritative.

## Approved Home order

1. Gallery Hero
2. Curated Rooms
3. New Objects
4. Designer Story
5. Material Edit
6. Gallery Grid
7. Featured Edit
8. Reviews
9. Journal
10. Footer

## Builder / Page Schema acceptance contract

Before any inherited implementation change, Wave 53 verifies:

- canonical `home.gallery-edit` v1 identity;
- historical predecessor/successor relationship;
- category-level visual and structural distinctness;
- exact ten-step Home order;
- all 14 Alap-compatible Page Schema presets;
- Desktop / Tablet / Mobile support;
- stable unique node IDs;
- only current shared binding namespaces;
- merchant-editable design tokens;
- shared Story + Visual hero composition;
- six independently editable Gallery Hero layers: image, overlay, eyebrow, heading, copy, primary CTA;
- complete shared story slots for Gallery stories;
- review truth remains external with null rating/count fallbacks;
- journal data remains on current `content.journal.items` binding;
- no marketing copy, CTA, price, proof, provenance or material truth baked into imagery;
- draft-only template installation;
- no shared runtime allowlist, component registry or binding namespace widening.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

The inherited canonical `src/lib/builder/templates/gallery-edit.ts` is intentionally unchanged at Wave 53 start. It may be changed only if the first exact-head current-baseline gate proves a real inherited drift.

## Shared authority contract

Gallery Edit remains presentation/composition over shared engines:

- E1: Storefront Runtime / Page Schema;
- E2: product discovery / catalog eligibility;
- E7: supplied material, dimension, finish, care and structured product truth;
- E10: shared editorial / Story presentation;
- E13: provider-neutral checkout.

The template does not own or infer product eligibility, price, compare-at price, inventory, variants, availability, reviews, designer provenance, material truth, dimensions, order state, checkout outcome or payment state.

PDP remains:

- Desktop: gallery 7/12 + buybox 5/12;
- Tablet: gallery 7/12 + buybox 5/12;
- Mobile: gallery 12/12 + buybox 12/12.

## Installation and entitlement boundary

Gallery Edit remains Alap-compatible and exposes the canonical 14-page package. Template installation is draft-only. A template switch or install may materialize storefront page drafts but may not mutate products, variants, pricing, inventory, customers, orders or B2B authority.

Checkout remains provider-neutral shared E13. No K&H/vPOS provider behavior, merchant secret, callback/process/status logic or payment-state authority belongs to Gallery Edit.

## First-batch rule

Wave 53 starts with one complete batch containing only:

1. this canonical reconstruction / scope document;
2. `gallery-edit-wave53-acceptance.ts` current-baseline contract;
3. `storefront-gallery-edit-wave53-reacceptance.test.ts` executable gate.

No speculative `gallery-edit.ts` hardening is included. The first exact-head CI result is authoritative:

- if green and no inherited drift is proven, `gallery-edit.ts` remains untouched and no second build-triggering commit is created;
- if red, only artifact-proven inherited drift may be repaired, without weakening shared contracts or widening registries/allowlists/binding namespaces.

## Non-scope

Wave 53 does not authorize:

- duplicate Gallery Edit template/key/namespace;
- template-local layout, hero, product-discovery, structured-product, pricing, inventory, review, checkout or payment engine;
- designer-provenance/material-truth authority;
- shared runtime allowlist / component registry / binding namespace widening;
- Visual Builder drag/drop, live canvas or inline editing;
- SQL/customer-baseline migration;
- Supabase production/staging mutation;
- Water-K status/plan mutation;
- K&H/vPOS/payment behavior change;
- production deployment;
- merge to `main`;
- Wave 54 implementation.

## Closure rule

Wave 53 closes only on its exact final HEAD when:

- CI is SUCCESS;
- Quality, TypeScript, production Next.js build, Security and customer-baseline guard pass;
- Release Manifest passes and its artifact/release hash are recorded;
- Fresh Install runs only if a baseline migration diff exists, otherwise it is correctly skipped;
- exact-SHA Vercel Preview is READY and remains non-production;
- any 302/401/403 caused by Deployment Protection is not mislabeled as an application 200 smoke;
- the PR remains Draft, open and unmerged, stacked on Wave 52;
- exact stacked diff is recorded;
- production/main/Supabase boundaries are re-verified without mutation;
- Wave 54 remains unstarted.
