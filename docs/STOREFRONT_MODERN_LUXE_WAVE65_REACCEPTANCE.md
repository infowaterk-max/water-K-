# Storefront Wave 65 — Modern Luxe Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 65 is the repository-proven direct successor to Wave 64 Street Drop: **Modern Luxe (`jewelry.modern-luxe` v1) Re-acceptance & Builder Hardening**.

This is not inferred from the wave number. The same successor relation is independently preserved across three historical storefront chains:

1. **Original scale-out:** PR #130 / Wave 9 Street Drop final head `3d17f1d8a67debc53caa11b100ee03a2eea4e270` is the exact base of PR #132 / Wave 10 Modern Luxe.
2. **First re-acceptance:** PR #149 / Wave 26 Street Drop is followed directly by PR #150 / Wave 27 Modern Luxe; PR #150 is based on `feature/storefront-street-drop-wave26` at `e003ddbc4481a5a38a5d4eb2add6d68a1765bb73`.
3. **Builder-hardening chain:** PR #227 / Wave 45 Street Drop final head `cb2be0616055078d1c42de94ebffc2a2b88b8e8c` is the direct base of PR #228 / Wave 46 Modern Luxe.

The later Block 21 template catalog also contains the concrete Modern Luxe and Street Drop packages, but that catalog is deliberately alphabetical/discovery-oriented rather than chronological. It therefore corroborates canonical package identity but is not successor authority and does not override the repeated historical stack order above.

No storefront release/reconciliation checkpoint is evidenced between Street Drop and Modern Luxe in these chains. The canonical Wave 65 scope is therefore **Modern Luxe Re-acceptance & Builder Hardening**.

## Exact current stack boundary

Wave 65 is created directly from the fully accepted Wave 64 exact head:

- parent branch: `feature/storefront-street-drop-wave64`;
- parent exact SHA: `2b76773ec5faedf9c20324668cd5e95fae55530a`;
- parent Draft PR: #275;
- Wave 65 branch: `feature/storefront-modern-luxe-wave65`;
- Wave 65 Draft PR base must remain `feature/storefront-street-drop-wave64`.

Parallel `main`, Email Builder, Visual Builder and Template Library UX movement remains external to this Storefront stack and must not be rebased or imported into Wave 65.

## Original Modern Luxe provenance

Original implementation: **Wave 10 / PR #132**.

- predecessor: Wave 9 Street Drop / PR #130;
- original implementation head: `c2148252457a76dc677d2d15b87904d5a3ebba64`;
- original final documentation head: `7d5908d5aae4467b5b3194137461ab7755d07599`;
- original Modern Luxe template blob at that final head: `72009e20e917f8a921afe0771e68b40bbfcec215`.

Wave 10 established the dedicated `jewelry.modern-luxe` package, the shared safe visual-layer primitives, separate Builder-editable Hero layers, the Airy spacing contract, 14 Alap-compatible Page Schema presets, shared E1/E2/E13 authority boundaries and the distinct modern/editorial luxury visual direction.

Historical re-acceptance: **Wave 27 / PR #150**.

- final accepted head: `bd754ef1193daaee34b5f3b7fc87c650c53a0c20`;
- Modern Luxe template blob remained `72009e20e917f8a921afe0771e68b40bbfcec215`;
- Wave 27 intentionally re-accepted the inherited implementation without rewriting the canonical template.

## Historical hardening counterpart and proven drift

The direct hardened counterpart is **Wave 46 / PR #228**.

Historical Wave 46 contract-first acceptance exposed one concrete inherited/current-contract defect:

- `header('modern-luxe-catalog')` generated node id `modern-luxe-catalog-header`;
- the nested `commerce.collection-header` node also used `modern-luxe-catalog-header`;
- current fail-closed validation therefore reported `NODE_ID_DUPLICATE` and rejected the package.

The minimal repair changed only the nested collection-header id:

- old: `modern-luxe-catalog-header`;
- accepted: `modern-luxe-catalog-collection-header`.

No binding namespace, commerce authority, shared component registry or runtime allowlist was widened.

Historical Wave 46 implementation repair head:

`30e0f0b6920e4fdde5470a7a2248a2f4df7d10f1`

Historical Wave 46 final accepted documentation head:

`d4acaa2a8d15445e042e0a2ea12ba4099daf61f0`

Historical accepted hardened Modern Luxe template blob at the exact Wave 46 final head:

`c87a3026522e9785202fd1f8155efbb61844129e`

## Current drift result

Current inherited Modern Luxe template blob at the exact Wave 64 parent:

`c87a3026522e9785202fd1f8155efbb61844129e`

Result: **byte-identical to the accepted hardened Wave 46 template**.

The current source visibly retains the accepted fix: Catalog uses `modern-luxe-catalog-collection-header`, while the page header remains separately identified by the generated `modern-luxe-catalog-header` id.

Therefore Wave 65 has no evidence-backed reason to modify `src/lib/builder/templates/modern-luxe.ts`, replay the historical patch, widen shared contracts, redesign Modern Luxe or manufacture implementation churn.

## Accepted Modern Luxe contract inherited by Wave 65

Modern Luxe remains the modern, spacious, premium editorial-luxury direction of Jewelry & Accessories and remains materially distinct from the neighboring directions:

- Modern Luxe: premium modern / spacious editorial luxury retail;
- Heritage Atelier: craftsmanship / provenance / heritage-story luxury;
- Statement Lab: contemporary material/spec/object gallery.

Protected visual and Builder characteristics:

- categories: Ékszerek, Órák, Táskák, Napszemüvegek, Kiegészítők;
- ivory background, champagne-gold merchant-adjustable accent, black typography;
- elegant editorial serif display typography plus clean sans UI;
- Builder fonts must be available, legally usable and support Hungarian characters;
- airy separated spacing rhythm;
- exact Home order `Layered Luxe Hero → Category Edit → Signature Selection → Ajándéknak választva → Brand Story → Footer`;
- no Hero carousel navigation;
- image, overlay, decoration, badge, title, subtitle and CTA remain separate editable/bindable Hero layers;
- hierarchy `Template → Page Presets → Section Presets → Components`;
- stable page-local unique node IDs and stable binding paths;
- Desktop / Tablet / Mobile scopes;
- 14 Alap-compatible Page Schema presets;
- PDP desktop/tablet 7/12 gallery + 5/12 buybox, mobile 12/12 + 12/12.

Shared authority remains fail-closed:

- E1 shared Page Schema/runtime;
- E2 shared product discovery/catalog/search authority;
- E13 shared provider-neutral checkout;
- optional E7 structured material/size/spec authority and shared Recommendations;
- price only from `pricing.*` bindings;
- inventory only from `inventory.*` bindings;
- variants only from `variant.*` bindings;
- no fabricated material, price, stock, rating, scarcity or product truth;
- no template-local jewelry, pricing, inventory, checkout or payment authority;
- 3D/AR remains optional future shared Pro/Add-on capability, never a Modern Luxe-local engine.

Installation remains draft-only under demo namespace `jewelry-modern-luxe`. Template installation may materialize storefront page drafts only and must not mutate products, variants, pricing, inventory, customers, orders or B2B authority.

## Minimal Wave 65 batch

Because the canonical template is byte-identical to the accepted hardened Wave 46 version, Wave 65 adds exactly three evidence/acceptance files:

1. `docs/STOREFRONT_MODERN_LUXE_WAVE65_REACCEPTANCE.md`;
2. `src/lib/builder/templates/modern-luxe-wave65-acceptance.ts`;
3. `tests/storefront-modern-luxe-wave65-reacceptance.test.ts`.

`src/lib/builder/templates/modern-luxe.ts` is intentionally untouched.

The executable Wave 65 contract covers canonical succession, exact parent authority, original and historical provenance, byte-identical hardening inheritance, the Wave 46 node-identity fix, visual separation, independent Hero layers, current binding namespaces, 14 responsive Alap presets, page-local unique node IDs, shared PDP bindings/grid, draft-only installation, demo-fixture authority safety and provider-neutral E13 checkout.

The existing Wave 46 historical acceptance and Wave 64 predecessor acceptance remain in the full quality suite and must stay green on the exact Wave 65 head.

## Read-only baseline before Wave 65 mutation

GitHub:

- `main`: `53b164daa032540f40df349c4e63df3980b3f41e`;
- Wave 64 exact head: `2b76773ec5faedf9c20324668cd5e95fae55530a`;
- PR #275: open Draft, base `feature/storefront-editorial-atelier-wave63`, head `feature/storefront-street-drop-wave64`, mergeable `true`, state `clean`, unmerged;
- Wave 64 exact-head CI run `34602215987`: SUCCESS;
- quality artifact `10265061166`, SHA-256 `5c805c1698318ba9826703c26969e92baef525f6144f0e054a2c15adb88c3079`, 566/566 suites and 2197/2197 tests PASS;
- release artifact `10264539506`, SHA-256 `604732d262b22ed932f9d15bf89ccd35dc567e1a574228af744886187255ab22`;
- Wave 64 releaseHash `427c949c2c917a7ec571c848bfa144108f8a48051726f03102e26512f96de4cb`.

Vercel:

- Wave 64 final preview `dpl_6J6ewH6vRvWHtUMUDin8SMhQokzU`: READY, `target:null`, exact Wave 64 Git SHA/ref;
- Wave 64 preview `/api/health`: HTTP 302 due Deployment Protection / SSO, therefore **SSO-blocked preview health**, not application-smoke PASS;
- current production deployment at reconstruction: `dpl_cyTpfQRv5oEMqXDx8ZeXjqQhY4aJ`, READY, target `production`, Git SHA `53b164daa032540f40df349c4e63df3980b3f41e`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `53b164daa032`.

Supabase / tenant read-only state:

- production `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging `waterk-staging` / `mtrfntrswxkdodolaaek`: `ACTIVE_HEALTHY`;
- `Shoperation Fresh Install` / `wwfyyhkmsovbzqiqcuzf`: `INACTIVE`;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, 1 product, 3 variants, 8 orders;
- storefront pages: 14; storefront page revisions: 14.

The 14/14 storefront state is treated only as parallel external movement. Wave 65 does not reconcile or mutate it.

## Customer baseline boundary

The exact Wave 64 parent carries customer baseline manifest blob:

`60b6705ec860849c563f6832460e3c7996f4e433`

Manifest contract:

- status `ready`;
- source policy `schema-snapshot-only`;
- default plan `alap`;
- `freshInstallProofRequired=false`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 65 introduces no migration and no sellable customer-schema change. The baseline must remain byte-identical, Fresh Install proof remains SKIPPED and the Fresh Install project must remain inactive.

## Explicit non-scope

Wave 65 does not authorize:

- a duplicate, redesigned or artificially modified Modern Luxe template;
- a template-local Builder or layout engine;
- a parallel Page Schema authority;
- a template-local jewelry, pricing, inventory, checkout, payment or 3D/AR engine;
- shared runtime, component registry or binding namespace widening without proven necessity;
- fabricated price, stock, rating, product, material or scarcity truth;
- SQL/customer-baseline migration;
- Supabase production/staging mutation;
- Fresh Install project lifecycle change;
- Water-K tenant status, plan or commerce-data mutation;
- K&H/vPOS/payment authority change;
- import/rebase of parallel `main` work;
- `main` merge;
- Wave 65 production deployment;
- Wave 66 implementation.

Final exact-head CI, artifacts, release manifest, Git-integrated preview and closure evidence are recorded on the stacked Draft PR after this single coherent Wave 65 commit reaches the closure gate.
