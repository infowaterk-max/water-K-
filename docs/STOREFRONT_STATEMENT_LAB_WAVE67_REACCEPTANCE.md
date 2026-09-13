# Storefront Wave 67 — Statement Lab Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 67 is the repository-proven direct successor to Wave 66 Heritage Atelier: **Statement Lab (`jewelry.statement-lab` v1) Re-acceptance & Builder Hardening**.

This scope is not inferred from the wave number. Independent repository evidence converges on the same ordering:

1. Original portfolio history records Statement Lab as the contemporary Jewelry direction after Modern Luxe while Heritage Atelier already existed as Golden #3: Wave 11 / PR #133 introduced `jewelry.statement-lab` without duplicating Heritage.
2. Historical current-baseline re-acceptance is explicit: Wave 28 / PR #151 Heritage Atelier is followed directly by Wave 29 / PR #152 Statement Lab, with PR #152 stacked on the exact Wave 28 branch.
3. Historical Builder-hardening repeats the same successor: Wave 47 / PR #232 Heritage Atelier is followed directly by Wave 48 / PR #233 Statement Lab, with Wave 48 stacked on the exact Wave 47 final head.
4. Wave 66 evidence independently records the Jewelry family as Modern Luxe → Heritage Atelier → Statement Lab and names Wave 48 as Heritage's direct hardening successor.
5. The template registry/package key remains `jewelry.statement-lab` v1; no replacement or parallel Statement Lab implementation exists.

There is no repository evidence for an intervening template wave or release checkpoint between Heritage Atelier and Statement Lab in the relevant hardening chain. Therefore Wave 67 canonical scope is **Statement Lab Re-acceptance & Builder Hardening**.

## Exact current stack boundary

Wave 67 starts directly from the fully accepted Wave 66 exact final head:

- parent branch: `feature/storefront-heritage-atelier-wave66`;
- parent exact SHA: `1dd8ed4d026d7723688327adbb9cec596fa8b96f`;
- parent Draft PR: #278;
- Wave 67 branch: `feature/storefront-statement-lab-wave67`;
- Wave 67 Draft PR base: `feature/storefront-heritage-atelier-wave66`.

Parallel `main`, Email Builder, Visual Builder and Template Library UX movement remains external and is not rebased or imported into the Storefront stack.

## Original Statement Lab provenance

Original implementation: **Wave 11 / PR #133 — Statement Lab**.

- original implementation head: `19392d57c72f220fc7d471a8928029d3ccbd1511`;
- original final documentation head: `5e5e8415b4c90e5e72d4355fb51ff3ae12d14ccc`;
- original Statement Lab template blob: `40bfbdb2a1eacbfb2a5d0c55699b996ec667e97e`.

Wave 11 established:

- `jewelry.statement-lab` v1;
- contemporary design-jewelry store × gallery × material/spec lab identity;
- shared E1 Runtime, E2 Product Discovery, E7 Compare & Spec, and E13 Checkout;
- no Statement Lab-local product/material/spec/compare authority;
- exact Home rhythm: `Asymmetric Opening → Floating Product Index → Material Study → Statement Grid → Object Detail → Footer`;
- shared layered visual primitives for the opening rather than a monolithic template-local hero;
- 14 Alap-compatible Page Schema presets;
- draft-only installation in demo namespace `jewelry-statement-lab`.

Historical re-acceptance: **Wave 29 / PR #152**.

- final accepted head: `405283339c6a9a0dadb518d5722b4caf3fc2f4e5`;
- Statement Lab template blob remained `40bfbdb2a1eacbfb2a5d0c55699b996ec667e97e`;
- Wave 29 re-accepted the inherited implementation without rewriting the canonical template.

## Historical hardened counterpart and proven drift

The direct hardened counterpart is **Wave 48 / PR #233**.

Wave 48's contract-first gate found one concrete inherited/current-contract defect: the Statement Lab Catalog Page Schema used the node ID `statement-lab-catalog-header` twice — once for the shared system header and once for the collection header. The current Page Schema validator correctly failed closed with `NODE_ID_DUPLICATE`.

First fail-closed acceptance head:

`0d47b07a90ab9abcef88a4285c9cce77ed08be1b`

Historical minimal repair:

- system header ID retained: `statement-lab-catalog-header`;
- collection header changed to: `statement-lab-catalog-collection-header`;
- no component key changed;
- no binding path changed;
- no shared runtime allowlist, component registry, binding namespace, E7 authority, E13 checkout authority, pricing, inventory, variant or payment authority was widened.

Green hardening implementation head:

`30548d731abe99b3e1bb48ab894bc6d23a5e4a99`

Historical final accepted head:

`fb63722ceb012a8f7a5b8ae103f6d92cc11b4f4d`

Historical accepted hardened Statement Lab template blob:

`75dc32af04d8b7cb42c5205f63b276260b7d33e0`

## Current drift result

Current inherited Statement Lab template blob at the exact Wave 66 parent:

`75dc32af04d8b7cb42c5205f63b276260b7d33e0`

Result: **byte-identical to the accepted hardened Wave 48 template**.

The current source visibly retains the accepted repair:

- the system header still owns `statement-lab-catalog-header`;
- the collection header owns `statement-lab-catalog-collection-header`;
- Catalog node IDs are page-local unique under the current validator.

Therefore Wave 67 has no evidence-backed reason to modify `src/lib/builder/templates/statement-lab.ts`, replay the historical patch, widen shared contracts or manufacture canonical source churn.

## Statement Lab visual and Builder contract

Statement Lab must remain materially distinct from its neighboring Jewelry directions:

- **Modern Luxe:** spacious, premium editorial luxury retail;
- **Heritage Atelier:** craftsmanship, provenance and classical premium storytelling;
- **Statement Lab:** contemporary object gallery × material/spec/design lab.

Protected visual DNA:

- off-white gallery background;
- silver-grey surfaces;
- graphite typography;
- exactly one restrained merchant accent;
- oxidized red / acid yellow / cobalt supported accent directions;
- grotesk display typography + clean sans UI + optional monospace specification accent;
- large object photography;
- macro material studies;
- asymmetric, precise gallery rhythm.

Protected Home sequence:

`Asymmetric Opening → Floating Product Index → Material Study → Statement Grid → Object Detail → Footer`

The opening continues to use shared layered components with independently editable object image, object/index label, display title and supporting copy. Marketing image, text/copy and CTA data remain independent Builder-editable values rather than baked visual assets.

Hierarchy remains `Template → Page Presets → Section Presets → Components`, with stable page-local node identities and stable binding paths.

## Structured product/material/spec authority

Statement Lab's material, manufacturing, specification, comparison and technical-document surfaces are presentation/read-model surfaces only.

Required full-experience shared engines remain:

- E1 shared Page Schema / Storefront runtime;
- E2 shared product discovery/catalog authority;
- E7 shared Compare & Spec Engine;
- E13 shared provider-neutral checkout.

Fail-closed truth boundaries remain:

- price only from pricing bindings;
- stock only from inventory bindings;
- variants only from variant bindings;
- material/manufacturing/spec facts only from E7 or authoritative product bindings when supplied;
- comparison only through shared E7 read-model surfaces;
- technical documents only from authoritative product document bindings;
- no template-local material/spec/product/compare/pricing/inventory/checkout/payment authority;
- no fabricated price, stock, rating, scarcity, provenance, material or manufacturing fact.

Empty defaults remain intentional for material/spec/compare/document surfaces when authoritative data is absent.

## Responsive / Page Schema / install invariants

Wave 67 executable acceptance revalidates:

- all 14 Page Schema presets;
- Desktop / Tablet / Mobile manifest support;
- page-local unique node IDs;
- existing shared binding namespaces only;
- Alap capability boundary;
- PDP desktop/tablet 7/12 gallery + 5/12 buybox, mobile 12/12 + 12/12;
- shared E1/E2/E7/E13 authority;
- provider-neutral E13 checkout;
- draft-only template installation;
- demo namespace `jewelry-statement-lab`;
- demo fixtures remain non-authoritative;
- template installation may mutate storefront page drafts only and may not mutate products, variants, pricing, inventory, materials, specifications, documents, customers, orders or B2B authority.

3D/AR is not a Statement Lab v1 dependency. If added later, it must remain a shared capability and may not become material/product truth authority.

## Minimal Wave 67 batch

Because the canonical template is byte-identical to the accepted hardened Wave 48 version, Wave 67 changes exactly three Wave-specific evidence/acceptance files:

1. `docs/STOREFRONT_STATEMENT_LAB_WAVE67_REACCEPTANCE.md`;
2. `src/lib/builder/templates/statement-lab-wave67-acceptance.ts`;
3. `tests/storefront-statement-lab-wave67-reacceptance.test.ts`.

`src/lib/builder/templates/statement-lab.ts` is intentionally untouched.

The existing Wave 48 Statement Lab acceptance and Wave 66 Heritage Atelier predecessor acceptance remain in the full quality suite and must stay green on the exact Wave 67 head.

## Read-only baseline before Wave 67 mutation

GitHub:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 66 exact head: `1dd8ed4d026d7723688327adbb9cec596fa8b96f`;
- PR #278: open Draft, unmerged, mergeable, base `feature/storefront-modern-luxe-wave65` @ `e4fe565482e7b081f445ece7ad88323093cea38c`, head exact Wave 66 SHA;
- exact-head CI run `34607741856`: SUCCESS;
- quality artifact `10266038504`, SHA-256 `fd2f0e965330c0b88306c523df53e977bdfcdbc4187a7675bbe4184e40a4c8f2`;
- release artifact `10266699812`, SHA-256 `c9410134af2c75a0ed686640ca4dbba25a23b81e4b17f20be6145565ac5fa528`;
- Wave 66 quality result: 570/570 suites, 2220/2220 tests PASS;
- Wave 66 targeted acceptance: 11/11 PASS.

Vercel:

- Wave 66 preview `dpl_2PtfuzyN1y68EJ7t5kTHXRrGjpwp`: READY, `target:null`, source Git integration, exact Wave 66 SHA/ref/PR #278;
- current production deployment: `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA`, READY, target `production`, Git ref `main`, SHA `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production canonical `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`.

Supabase read-only state:

- `waterk-platform` (`ewdederyvnwmghlydbno`): ACTIVE_HEALTHY;
- `waterk-staging` (`rfuvzgumbardvbvqjxdq`): ACTIVE_HEALTHY;
- `Shoperation Fresh Install` (`istjjkdcvsvilrycqecd`): INACTIVE.

Water-K read-only invariants:

- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products 1;
- variants 3;
- orders 8;
- storefront pages 14;
- storefront page revisions 14.

The 14/14 storefront state remains parallel external movement and is not reconciled or mutated by Wave 67.

## Customer baseline boundary

The exact Wave 66 parent carries customer baseline manifest blob:

`60b6705ec860849c563f6832460e3c7996f4e433`

Manifest invariants:

- `status=ready`;
- `sourcePolicy=schema-snapshot-only`;
- `defaultPlan=alap`;
- `freshInstallProofRequired=false`;
- proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 67 introduces no SQL, migration or sellable customer-schema change. The baseline must remain byte-identical, Fresh Install proof remains SKIPPED and the Fresh Install project must remain inactive.

## Explicit non-scope

Wave 67 does not authorize:

- a duplicate, redesigned or artificially modified Statement Lab template;
- a template-local Builder/layout/Page Schema/product/material/spec/compare/pricing/inventory/checkout/payment engine;
- shared runtime, component registry or binding namespace widening without proven necessity;
- new fabricated commerce, product, material, specification or provenance authority;
- SQL/customer-baseline migration;
- production/staging Supabase mutation;
- Fresh Install project lifecycle change;
- Water-K status, plan or commerce mutation;
- K&H/vPOS/payment authority change;
- reconciliation of the external 14/14 storefront state;
- import/rebase of parallel `main`, Visual Builder, Email Builder or Template Library UX work;
- `main` merge;
- Wave 67 production deployment;
- Wave 68 implementation.

Final exact-head CI, artifacts, release manifest, Git-integrated preview and closure evidence are recorded on the stacked Draft PR after the single coherent Wave 67 commit reaches the closure gate.
