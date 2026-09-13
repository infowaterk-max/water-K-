# Storefront Wave 66 — Heritage Atelier Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 66 is the repository-proven direct successor to Wave 65 Modern Luxe: **Heritage Atelier (`jewelry.heritage-atelier` v1) Re-acceptance & Builder Hardening**.

This scope is not inferred from the wave number. The successor relationship is preserved independently in repository history:

1. **Jewelry re-acceptance chain:** PR #150 / Wave 27 Modern Luxe is followed directly by PR #151 / Wave 28 Heritage Atelier. PR #151 is stacked on `feature/storefront-modern-luxe-wave27` at `bd754ef1193daaee34b5f3b7fc87c650c53a0c20`.
2. **Builder-hardening chain:** PR #228 / Wave 46 Modern Luxe final head `d4acaa2a8d15445e042e0a2ea12ba4099daf61f0` is the exact base of PR #232 / Wave 47 Heritage Atelier.
3. **Successor continuation:** Wave 48 Statement Lab is stacked directly on Wave 47 Heritage Atelier, confirming that Heritage occupies the slot between Modern Luxe and Statement Lab.
4. **Portfolio documentation:** the Jewelry family repeatedly records Modern Luxe → Heritage Atelier → Statement Lab as the three distinct directions.

The original Heritage implementation predates the scale-out family sequence: Wave 3 / PR #124 implemented shared E10 Editorial / Story Engine v1 and Golden #3 Heritage Atelier. That original provenance does not override the later, repeated direct successor evidence above.

No storefront release/reconciliation checkpoint is evidenced between Modern Luxe and Heritage Atelier in the relevant re-acceptance/hardening sequence. The canonical Wave 66 scope is therefore **Heritage Atelier Re-acceptance & Builder Hardening**.

## Exact current stack boundary

Wave 66 starts directly from the fully accepted Wave 65 exact final head:

- parent branch: `feature/storefront-modern-luxe-wave65`;
- parent exact SHA: `e4fe565482e7b081f445ece7ad88323093cea38c`;
- parent Draft PR: #277;
- Wave 66 branch: `feature/storefront-heritage-atelier-wave66`;
- Wave 66 Draft PR base: `feature/storefront-modern-luxe-wave65`.

Parallel `main`, Email Builder, Visual Builder and Template Library UX movement remains external to the Storefront stack and is not rebased or imported into Wave 66.

## Original Heritage Atelier provenance

Original implementation: **Wave 3 / PR #124 — E10 Editorial / Story Engine + Golden #3 Heritage Atelier**.

- original implementation head: `ccedcf22527646533a8aa0f45d8d87499ff0eb20`;
- original final documentation head: `3b8e1853ae92237e8cc72ca7e7f348446d5259f5`;
- original Heritage template blob: `64e3631750cd160ff73ef0cfe3956c8afc5a9ae7`.

Wave 3 established:

- `jewelry.heritage-atelier` v1;
- shared E10 `shoporation.editorial-story-engine.v1` rather than template-local Story authority;
- heritage craftsmanship + provenance + editorial commerce visual DNA;
- the eleven-stage Home narrative;
- 14 Alap-compatible Page Schema presets;
- draft-only installation in demo namespace `jewelry-heritage-atelier`;
- shared E1/E2/E10/E13 boundaries, with E7 only for authoritative structured material/spec facts when supplied.

Historical re-acceptance: **Wave 28 / PR #151**.

- final accepted head: `533e37870ad2ced51fa18f4680d6a186ff39467d`;
- Heritage template blob remained `64e3631750cd160ff73ef0cfe3956c8afc5a9ae7`;
- Wave 28 intentionally re-accepted the inherited implementation without rewriting the canonical template.

## Historical hardened counterpart and proven drift

The direct hardened counterpart is **Wave 47 / PR #232**.

The Wave 47 contract-first gate exposed one concrete inherited/current-contract defect. Historical Heritage Page Schema still referenced a now-disallowed `story.*` binding namespace:

- `story.provenance.claims`;
- `story.timeline.items`;
- `story.journal.items`.

First fail-closed acceptance head:

`2ebfd1f2d307d01d1e019f0ffc10bfe40d475e3e`

CI run `34558990552` correctly failed Quality while Security and customer-baseline validation passed. The root cause was not an E10 engine defect: the current shared Storefront binding allowlist already exposed common `content.*` and verified-origin projections, and did not expose `story.*` as a Page Schema binding namespace.

The accepted minimal repair changed only the inherited template projection:

- verified provenance claims → `origin.verifiedClaims`;
- timeline items → `content.storyTimeline.items`;
- journal items → `content.storyJournal.items`.

No shared runtime allowlist, component registry, binding namespace, E10 Story Engine, E13 checkout, pricing, inventory or product authority was widened.

Historical green implementation head:

`4caaddf2259b6398af988ecb8e22635c555f1df8`

Historical final accepted head:

`c11fa8bb0b863f87c3605870d23327e519c45b57`

Historical accepted hardened Heritage template blob:

`ec219d963b8cbadf3480acbb7a5e5da75543e59f`

## Current drift result

Current inherited Heritage template blob at the exact Wave 65 parent:

`ec219d963b8cbadf3480acbb7a5e5da75543e59f`

Result: **byte-identical to the accepted hardened Wave 47 template**.

The current source visibly retains the accepted binding repair:

- provenance uses `origin.verifiedClaims`;
- timeline uses `content.storyTimeline.items`;
- journal uses `content.storyJournal.items`;
- none of the Heritage Page Schema binding paths begins with `story.*`.

Therefore Wave 66 has no evidence-backed reason to modify `src/lib/builder/templates/heritage-atelier.ts`, replay the historical patch, widen shared contracts or manufacture template churn.

## Heritage Atelier visual and Builder contract

Heritage Atelier remains materially distinct from neighboring directions:

- **Modern Luxe:** modern, spacious, premium editorial retail;
- **Heritage Atelier:** heritage, craftsmanship, provenance and story-led luxury;
- **Statement Lab:** contemporary material/spec/object gallery.

Protected Heritage visual DNA:

- warm ivory / parchment background;
- deep charcoal typography;
- burgundy + antique brass accent language;
- muted stone secondary tones;
- heritage editorial serif + clean sans UI;
- macro material / workshop / craft imagery;
- generous editorial whitespace;
- restrained provenance-luxury chrome;
- merchant-adjustable accent token.

Protected Home sequence:

`Heritage Hero → Featured Collection Story → Craftsmanship Feature → Product Selection → Maker/Atelier Story → Material & Origin → Timeline/Heritage → Editorial Commerce Grid → Journal → Service/Care → Footer`

The hero and marketing Story surfaces keep image, title/copy and CTA values in distinct component bindings. Marketing copy and commercial truth are not baked into image assets. Hierarchy remains `Template → Page Presets → Section Presets → Components`, with stable page-local node identities and stable binding paths.

## Shared runtime and authority boundaries

Required full-experience engines remain:

- E1 shared Page Schema / Storefront runtime;
- E2 shared discovery/catalog authority;
- E10 shared Editorial / Story Engine;
- E13 shared provider-neutral checkout.

E7 remains useful only when authoritative structured material/spec data is supplied.

Fail-closed truth boundaries remain:

- price only from pricing bindings;
- stock only from inventory bindings;
- variants only from variant bindings;
- verified provenance only from explicit verified-origin evidence through the shared E10 contract;
- structured material/spec facts only from E7 or authoritative product bindings;
- no template-local Story, provenance, jewelry-product, pricing, inventory, checkout or payment authority;
- no new fabricated price, stock, rating, scarcity, maker, provenance or material truth is introduced by Wave 66.

Story validation continues to reject unverified provenance and duplicated product/pricing authority in Story relations.

## Responsive / Page Schema / install invariants

Wave 66 executable acceptance revalidates:

- all 14 Page Schema presets;
- Desktop / Tablet / Mobile manifest support;
- page-local unique node IDs;
- existing shared binding namespaces only;
- Alap capability boundary;
- PDP desktop/tablet 7/12 gallery + 5/12 buybox, mobile 12/12 + 12/12;
- provider-neutral E13 checkout;
- draft-only template installation;
- demo namespace `jewelry-heritage-atelier`;
- template switching may materialize storefront page drafts only and may not mutate products, variants, pricing, inventory, Story Documents, collections, makers, customers, orders or B2B authority.

The inherited replaceable demo fixtures remain non-authoritative because template installation cannot mutate sellable product/variant/commerce authority. Wave 66 adds no demo fixture or fabricated commerce/provenance/material datum.

## Minimal Wave 66 batch

Because the canonical template is byte-identical to the accepted hardened Wave 47 version, Wave 66 changes exactly three Wave-specific evidence/acceptance files:

1. `docs/STOREFRONT_HERITAGE_ATELIER_WAVE66_REACCEPTANCE.md`;
2. `src/lib/builder/templates/heritage-atelier-wave66-acceptance.ts`;
3. `tests/storefront-heritage-atelier-wave66-reacceptance.test.ts`.

`src/lib/builder/templates/heritage-atelier.ts` is intentionally untouched.

The existing Wave 47 Heritage acceptance and Wave 65 Modern Luxe predecessor acceptance remain part of the full quality suite and must stay green on the exact Wave 66 head.

## Read-only baseline before Wave 66 mutation

GitHub:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 65 exact head: `e4fe565482e7b081f445ece7ad88323093cea38c`;
- PR #277: open Draft, unmerged, mergeable, base `feature/storefront-street-drop-wave64` @ `2b76773ec5faedf9c20324668cd5e95fae55530a`, head `feature/storefront-modern-luxe-wave65` @ exact Wave 65 head;
- exact-head CI run `34604041530`: SUCCESS;
- quality artifact `10264778680`, SHA-256 `716b9c2b1fba15e4951a63a8cd6d01f1be6c669ac3ee32f7f32d4c6f3aec9afc`;
- release artifact `10265347984`, SHA-256 `70c57c422572df5d12b280e3e42aaf87babb187fc63d020749434ea078a09dcc`;
- Wave 65 quality result: 568/568 suites, 2208/2208 tests PASS;
- Wave 65 targeted acceptance: 10/10 PASS;
- Wave 46 historical acceptance: 10/10 PASS;
- Wave 64 predecessor acceptance: 11/11 PASS.

Vercel:

- Wave 65 preview `dpl_DngEVhvkdCo5jiNFGK9HRiVwi1ST`: READY, `target:null`, source Git integration, exact Wave 65 SHA/ref/PR #277;
- Wave 65 preview `/api/health`: HTTP 302 due Deployment Protection / SSO and therefore **SSO-blocked preview health**, not application-smoke PASS;
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

The 14/14 storefront state remains parallel external movement and is not reconciled or mutated by Wave 66.

## Customer baseline boundary

The exact Wave 65 parent carries customer baseline manifest blob:

`60b6705ec860849c563f6832460e3c7996f4e433`

Manifest invariants:

- `status=ready`;
- `sourcePolicy=schema-snapshot-only`;
- `defaultPlan=alap`;
- `freshInstallProofRequired=false`;
- proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 66 introduces no SQL, migration or sellable customer-schema change. The baseline must remain byte-identical, Fresh Install proof remains SKIPPED and the Fresh Install project must remain inactive.

## Explicit non-scope

Wave 66 does not authorize:

- a duplicate, redesigned or artificially modified Heritage template;
- a template-local Builder/layout/Page Schema/Story/provenance/product/pricing/inventory/checkout/payment engine;
- shared runtime, component registry or binding namespace widening without proven necessity;
- new fabricated commerce, product, provenance or material authority;
- SQL/customer-baseline migration;
- production/staging Supabase mutation;
- Fresh Install project lifecycle change;
- Water-K status, plan or commerce mutation;
- K&H/vPOS/payment authority change;
- reconciliation of the external 14/14 storefront state;
- import/rebase of parallel `main`, Visual Builder, Email Builder or Template Library UX work;
- `main` merge;
- Wave 66 production deployment;
- Wave 67 implementation.

Final exact-head CI, artifacts, release manifest, Git-integrated preview and closure evidence are recorded on the stacked Draft PR after the single coherent Wave 66 commit reaches the closure gate.
