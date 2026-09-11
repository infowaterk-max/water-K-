# Storefront Runtime Scale-out Wave 46 — Modern Luxe Re-acceptance & Builder Hardening

## Status

Wave 46 re-accepts the inherited **Modern Luxe (`jewelry.modern-luxe` v1)** template on the current stacked storefront baseline. It is the repository-proven current counterpart of historical **Wave 27 / PR #150** and is stacked directly on the completed Wave 45 Street Drop branch.

This wave does not introduce a second Modern Luxe implementation and does not advance Wave 47.

## Canonical reconstruction

Historical repository evidence:

- PR #149 — Wave 26 Street Drop, final head `e003ddbc4481a5a38a5d4eb2add6d68a1765bb73`.
- PR #150 — Wave 27 Modern Luxe Re-acceptance, base `feature/storefront-street-drop-wave26` at the exact PR #149 head.
- Historical Wave 27 final head: `bd754ef1193daaee34b5f3b7fc87c650c53a0c20`.
- Historical template key/version: `jewelry.modern-luxe` v1.
- The historical PR explicitly defines the work as current-baseline re-acceptance of an inherited implementation, not a duplicate template.

Current Wave 46 stack:

- Base branch: `feature/storefront-street-drop-wave45`
- Exact base SHA: `cb2be0616055078d1c42de94ebffc2a2b88b8e8c`
- Wave 46 branch: `feature/storefront-modern-luxe-wave46`

## Accepted Modern Luxe contract

Modern Luxe remains the modern, spacious, premium luxury-retail direction of the Jewelry & Accessories family and stays structurally distinct from Heritage Atelier and Statement Lab.

Visual contract:

- categories: Ékszerek, Órák, Táskák, Napszemüvegek, Kiegészítők;
- ivory background, champagne-gold merchant-adjustable accent, black typography;
- large close-up jewelry/watch/bag/accessory imagery;
- elegant editorial serif display typography plus clean sans-serif UI;
- Builder fonts must be available, legally usable and support Hungarian characters;
- airy separated rhythm;
- no crowded Home layout, no hero next/previous carousel, no baked-in business copy, no overloaded gold treatment.

Exact inherited Home order:

1. Layered Luxe Hero
2. Category Edit
3. Signature Selection
4. Ajándéknak választva
5. Brand Story
6. Footer

Hero navigation remains `none`.

Builder layers remain independently editable/bindable: image, overlay, decoration, badge, title, subtitle and CTA. Shared spacing remains Narrow / Normal / Airy / Custom, default Airy, with section gap / inner padding / column gap and Desktop / Tablet / Mobile scopes.

The hierarchy remains Template → Page Presets → Section Presets → Components. Wave 46 does not implement Visual Builder drag/drop, live canvas or inline editing.

## Commerce and authority boundaries

Required shared engines remain E1 Runtime, E2 Product Discovery and E13 Checkout. E7 structured material/size/spec data and shared Recommendations remain optional reusable capabilities.

Fail-closed authority rules remain:

- price from `pricing.*` bindings only;
- stock/inventory from `inventory.*` bindings only;
- variants from `variant.*` bindings only;
- material/size/spec facts from E7 or authoritative product bindings only when supplied;
- recommendations through the shared recommendation surface;
- checkout through shared provider-neutral E13;
- no template-specific jewelry product authority;
- no fabricated material claims, stock scarcity or commerce truth;
- no template-local pricing, inventory, checkout or payment authority.

3D/AR is not a Modern Luxe v1 dependency. Any future 3D/AR support must be a shared Pro/Add-on capability rather than a Modern Luxe-local engine.

The package continues to expose 14 Alap-compatible Page Schema presets and uses demo namespace `jewelry-modern-luxe`. Template installation remains draft-only and cannot mutate products, variants, customers, orders or B2B records.

## Contract-first gate

The first Wave 46 gate intentionally added only the current acceptance contract and targeted re-acceptance tests before modifying inherited implementation behavior.

Exact first-gate head:

`b937110256ca6995d69e4094ac82077e77af588a`

CI run:

`34557884288` — **FAILURE at Quality**

Other gate results:

- Security: PASS
- Customer database baseline guard: PASS
- Fresh Install proof: SKIPPED, because Wave 46 introduced no migration
- TypeScript / production build / release manifest: skipped after fail-closed Quality failure

Mandatory failed Quality artifact:

- artifact id: `10183241097`
- GitHub digest: `sha256:5c843c4e83371d68f700360b1457efdb8efdd6417d5b69cf2ec7c7c96678b656`
- downloaded ZIP digest: exact match
- total: 470 suites / 1719 tests
- failed: 2 suite counters / 3 tests
- every failure originated from the Wave 46 Modern Luxe acceptance suite and resolved to one root cause.

### Proven inherited/current-contract drift

The Catalog Page Schema contained duplicate node identity:

- `header('modern-luxe-catalog')` generated node id `modern-luxe-catalog-header`;
- the nested `commerce.collection-header` node also used `modern-luxe-catalog-header`.

This caused `NODE_ID_DUPLICATE`, failed unique-node identity evidence and made fail-closed template installation reject the package.

No binding namespace, commerce authority, shared registry, allowlist or component-contract drift was found.

## Minimal inherited implementation repair

Only the proven duplicate node identity was changed:

- old collection-header id: `modern-luxe-catalog-header`
- current collection-header id: `modern-luxe-catalog-collection-header`

No shared runtime, component registry, binding namespace or allowlist was widened. No SQL, migration, new engine or commerce authority was introduced.

Exact implementation head:

`30e0f0b6920e4fdde5470a7a2248a2f4df7d10f1`

Exact compare against Wave 45 base at implementation gate:

- 3 commits ahead
- 0 behind
- acceptance contract added
- acceptance test added
- inherited `modern-luxe.ts`: exactly +1 / -1 for the duplicate node-id correction

## Green implementation gate

CI run `34558066150` — **SUCCESS**.

- Security: PASS
- Customer database baseline guard: PASS
- Quality: PASS — 470 / 470 suites, 1719 / 1719 tests, 0 failed/pending/todo
- TypeScript: PASS
- Production build: PASS
- Release manifest generation/upload: PASS
- Fresh Install proof: SKIPPED — no migration and storefront customer baseline remains proof-ready

Downloaded and content-verified implementation artifacts:

### Quality

- artifact id: `10183309512`
- GitHub digest: `sha256:4ff9531341d2f2e4489f4776f4d6db9487af202b662729cb09760cbc84895d0f`
- downloaded ZIP digest: exact match
- `success: true`
- 470 / 470 suites PASS
- 1719 / 1719 tests PASS

### Release manifest

- artifact id: `10183337389`
- GitHub digest: `sha256:3033fd6eb0505ca7680c4d2505236d8e1b7d8968cf414e02fabd7cef6b30b767`
- downloaded ZIP digest: exact match
- manifest SHA: `30e0f0b6920e4fdde5470a7a2248a2f4df7d10f1`
- ref: `feature/storefront-modern-luxe-wave46`
- environment: `ci`
- release hash: `0f0880c16d883e8d0d3541b8d103a4c6e652432d69eb49d44681d5abada94adc`

## Customer baseline / Fresh Install evidence

The stacked storefront baseline manifest remains:

- status: `ready`
- source policy: `schema-snapshot-only`
- `freshInstallProofRequired: false`
- previous genuine empty-target Fresh Install proof: GitHub Actions run `34346892406`
- proof contract SHA-256: `8cb833cfc5063c777c1335e6cc64d5447de3c0a418ac3145fbd54d38a6224e0a`

Wave 46 contains no customer-baseline migration, therefore a new Fresh Install execution is neither required nor appropriate for this wave.

## Production isolation evidence

During Wave 46 work, unrelated roadmap development moved production `main` independently to `d415e1176d0289724c3e56aab59f14c3ee904a35` (Roadmap Block 18). The storefront chain was deliberately not rebased onto that commit.

Production checks during Wave 46:

- Vercel production Git SHA: `d415e1176d0289724c3e56aab59f14c3ee904a35`
- production deployment state: READY
- `/api/health`: HTTP 200
- health status: `ok`
- database status: `ok`
- production version: `d415e1176d02`
- `waterk-platform`: ACTIVE_HEALTHY
- `waterk-staging`: ACTIVE_HEALTHY
- Water-K instance remains `pilot`
- Water-K subscription plan remains `pro`

Wave 46 performed no Supabase production/staging mutation and no production deployment.

## Preserved invariants

- no `main` merge;
- no Wave 46 production deployment;
- no Supabase production/staging mutation;
- no SQL/migration;
- Water-K remains `pilot` / `pro`;
- no template-local pricing, inventory, product eligibility, checkout, payment, order, rating/review or product authority;
- no template-specific jewelry authority engine;
- no Modern Luxe-local 3D/AR engine;
- no shared runtime allowlist, registry or binding namespace widening;
- no Visual Builder drag/drop, live canvas or inline editing implementation;
- no Wave 47 implementation.

## Closure sequence

This evidence document is the final documentation change for Wave 46. Closure additionally requires the documentation-head exact CI to be green, its Quality and release-manifest artifacts to be downloaded and verified, a READY `target=null` Vercel preview at the exact final SHA, and an open/draft/mergeable stacked PR whose base is `feature/storefront-street-drop-wave45`.
