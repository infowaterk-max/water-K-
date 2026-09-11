# Storefront Scale-out Wave 43 — Monarche Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 43 is the current-baseline re-acceptance of the repository's original **Wave 24 — Golden #1 Monarche**. The ordering is repository-derived, not newly invented:

- original PR #146: **Wave 23 — Performance Lab** (`sport.performance-lab`);
- original PR #147: **Wave 24 — Golden #1 Monarche** (`fashion.monarche`), based directly on the Performance Lab Wave 23 branch and exact final head;
- historical PR #122 remains the original Golden #1 Monarche / Core Commerce implementation;
- current canonical template key: `fashion.monarche`;
- current template version: `1`;
- canonical portfolio position: balanced modern premium mainstream fashion;
- shared full-experience engine contract: `E1 + E2 + E10 + E13`, with `E7` optional for structured product facts;
- 14 Alap-compatible Page Schema presets;
- demo namespace: `fashion-monarche`.

Wave 43 does not create a second Monarche implementation and does not introduce a fashion-specific runtime or commerce engine.

## Canonical visual and structural identity

The accepted Monarche direction remains:

- modern editorial luxury commerce;
- warm off-white background;
- black / graphite text and chrome;
- soft stone surfaces;
- merchant-replaceable accent;
- elegant serif/display typography plus clean sans UI;
- generous whitespace;
- editorial fashion photography;
- quiet image-led product cards;
- restrained premium buttons;
- 4:5 collection and product imagery.

It remains structurally and visually separate from Editorial Atelier asymmetry, Street Drop culture and discount-megastore density.

Protected Home sequence:

1. Editorial Hero
2. Collection Navigation
3. New Arrivals
4. Editorial Split Feature
5. Product Story Grid
6. Featured Collection
7. Social Proof/Reviews
8. Journal Preview
9. Newsletter
10. Footer

Protected PDP composition:

- desktop/tablet gallery: 7/12;
- desktop/tablet buybox: 5/12;
- mobile gallery and buybox: 12/12.

Protected fallback navigation:

`LOGO | Újdonságok | Női | Férfi | Kollekciók | Journal`

Approved utility intent remains `Keresés · Fiók · Kedvencek`; the existing shared-header boundary remains `shared-header-extension-required-no-template-specific-child-hack` rather than introducing a Monarche-specific child renderer.

## Baseline checked before Wave 43 work

The Wave 43 branch was created directly from the closed Wave 42 final head, without rebasing to the independently advancing production mainline:

- base branch: `feature/storefront-performance-lab-wave42`;
- exact base SHA: `d9f31bae63823ab5b0f64e71abdb1268e13dd732`;
- Wave 42 Draft PR #220: open, draft, merged=false, mergeable=true;
- Wave 42 final CI #2474 / run `34527495053`: SUCCESS;
- Wave 42 final Vercel preview `dpl_FxunhGdN4Jqdvq8GwK4nrEaexzUQ`: READY, `target=null`, exact Wave 42 SHA.

At the initial production read-only check:

- `main`: `723ce76973b6b16055db25ec489954adb0edb088` (Product Intake Center v1 / PR #212);
- production Vercel deployment `dpl_DiAHhQ5DLJ8zJBTaBe51cdg7gsTH`: READY, target `production`, exact main SHA;
- `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `723ce76973b6`;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging Supabase `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- Water-K instance: id `56ffdbca-0614-4175-8c56-6255d38d7f53`, slug `water-k`, status `pilot`, subscription plan `pro`.

No production, staging or tenant mutation was performed.

## Customer baseline and Fresh Install status

The stacked Wave 42/Wave 43 baseline manifest is unchanged by this storefront work:

- status: `ready`;
- source policy: `schema-snapshot-only`;
- default plan: `alap`;
- `freshInstallProofRequired=false`;
- proof contract SHA-256: `8cb833cfc5063c777c1335e6cc64d5447de3c0a418ac3145fbd54d38a6224e0a`;
- referenced genuine empty-target Fresh Install proof run `34346892406`: SUCCESS.

The independently advanced production `main` currently has a newer Product Intake Center customer migration (`0010`) and therefore its manifest is `snapshot-reviewed` with `freshInstallProofRequired=true`. Wave 43 intentionally does not rebase onto that unrelated mainline change, does not claim that newer production baseline proof as complete, and introduces no customer schema change of its own.

## Contract-first gate

The first Wave 43 commit intentionally added only the repository-derived current-baseline acceptance contract and targeted Wave 43 tests before any inherited Monarche implementation change:

- first-gate / accepted implementation SHA: `0d6383b238da704edec81789d1cc0cc6526b6e90`;
- commit: `test(storefront): add Wave 43 Monarche reacceptance gate`;
- CI: #2478 / run `34528949056`;
- result: SUCCESS.

The first gate proved that the inherited Monarche package already satisfies the current shared contract. Therefore no speculative or unnecessary template hardening was applied.

CI gates:

- customer database baseline guard: PASS;
- Quality tests: PASS;
- TypeScript: PASS;
- production build: PASS;
- production dependency security audit: PASS;
- Fresh Install proof: skipped as expected because `freshInstallProofRequired=false` on the stacked baseline.

Downloaded and inspected quality artifact:

- artifact id: `10172722234`;
- GitHub digest: `sha256:13fc3e861fc97cfcddc0df18cae25940c29790ecbe3aa175417da53b19d7fbbd`;
- independently recalculated ZIP digest matched exactly;
- 464 / 464 suites PASS;
- 1684 / 1684 tests PASS;
- targeted Wave 43 acceptance: 11 / 11 PASS.

Downloaded and inspected release artifact:

- artifact id: `10172769875`;
- GitHub digest: `sha256:6c7edc042bad34db55de0413bd66eaf2aba2bc7dc95fa6221a0fc74aeb09e4b8`;
- independently recalculated ZIP digest matched exactly;
- manifest exact SHA: `0d6383b238da704edec81789d1cc0cc6526b6e90`;
- manifest ref: `feature/storefront-monarche-wave43`;
- release hash: `cc5c777f9a91a3e2dc4ca7f577e3677d57cd32a0acca1671e67594b452851c0c`.

Accepted implementation Vercel preview:

- deployment: `dpl_TmaJNWZcTV3raGH88YC5aBw8Cy7Z`;
- URL: `water-k-native-mt2t1bvxq-infowaterk-5067.vercel.app`;
- state: READY;
- target: `null`;
- Git SHA: `0d6383b238da704edec81789d1cc0cc6526b6e90`.

## Current-contract acceptance

The 11 targeted Wave 43 checks prove:

1. historical Wave 24 Monarche follows Performance Lab directly and is the canonical Wave 43 scope;
2. the balanced modern premium Monarche visual identity remains intact;
3. the protected header/navigation direction remains on the shared header contract without a template-local renderer hack;
4. the exact ten-part Home sequence and independently bindable hero/split layers remain intact;
5. authority stays on shared `E1/E2/E10/E13`, with optional source-supplied `E7` facts;
6. all Monarche bindings stay within current shared binding namespaces and no template-local truth namespace exists;
7. node IDs are stable and unique across every Page Schema preset;
8. all 14 Alap-compatible presets pass the current fail-closed shared registry/runtime validation;
9. the protected 7/12 + 5/12 PDP and shared product/pricing/inventory bindings remain intact;
10. installation stays draft-only and `fashion-monarche` namespaced, with demo fixtures free from fabricated commerce/product authority;
11. checkout stays provider-neutral and the package remains future Builder-compatible without widening shared contracts.

## Builder and authority invariants

Wave 43 remains Builder-native:

`Template → Page Presets → Section Presets → Components`

The accepted contract preserves:

- stable node IDs;
- stable binding paths;
- shared Desktop / Tablet / Mobile responsive grid;
- 14 Page Schema presets;
- `alap` minimum plan;
- E2 product-discovery/catalog/search/eligibility authority;
- E10 editorial/journal/story authority;
- optional E7 structured source-supplied product facts;
- E13 provider-neutral cart/checkout authority;
- shared review authority with no fabricated default score.

The template does not invent price, stock, inventory, eligibility, ratings, product attributes, material/durability claims, checkout/payment state or order authority.

## No-change hardening decision

Unlike some earlier re-acceptance waves, the contract-first Wave 43 gate found no inherited current-contract drift. Repository evidence plus the actual quality artifact therefore justify **no changes to `src/lib/builder/templates/monarche.ts`** in this wave.

This is deliberate: a green canonical inherited package is not modified merely to create implementation churn, and shared runtime/component registry/page allowlist/binding namespace rules are not widened.

## Non-scope and mutation ledger

Wave 43 does not introduce:

- duplicate Monarche template;
- fashion-specific commerce/runtime engine;
- template-specific header child hack;
- Visual Builder drag/drop, live canvas or inline editing;
- shared runtime/registry/page-allowlist/binding-namespace widening;
- SQL or migration files;
- payment-provider changes;
- production deployment by the storefront wave;
- Supabase production/staging mutation;
- Water-K tenant status or plan change;
- merge to `main`;
- Wave 44 implementation.

This evidence document is committed after the accepted implementation head so that a new exact-head CI and Vercel preview can validate the documentation final HEAD before Wave 43 closure.
