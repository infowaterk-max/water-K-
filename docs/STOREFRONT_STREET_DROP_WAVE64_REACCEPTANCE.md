# Storefront Wave 64 — Street Drop re-acceptance & Builder hardening

## Scope reconstruction

Wave 64 is the repository-proven current-baseline successor to Wave 63 Editorial Atelier: **Street Drop (`fashion.street-drop` v1)**.

This conclusion is supported by two independent historical chains:

1. Original scale-out chain: PR #148 / Wave 25 Editorial Atelier is followed directly by PR #149 / Wave 26 Street Drop. PR #149 is stacked on `feature/storefront-editorial-atelier-wave25`.
2. Historical re-acceptance chain: PR #225 / Wave 44 Editorial Atelier is followed directly by PR #227 / Wave 45 Street Drop. PR #227 is stacked on `feature/storefront-editorial-atelier-wave44`.

No release, infra, Builder, runtime or reconciliation checkpoint is recorded between Editorial Atelier and Street Drop in either chain. Wave 64 therefore must not skip a checkpoint and must not invent a different successor.

## Exact stack boundary

Current parent authority is frozen at the fully accepted Wave 63 exact head:

- parent branch: `feature/storefront-editorial-atelier-wave63`
- parent exact SHA: `9a8b9e0bfe7501af4054ab4353d2f6da4e217378`
- parent Draft PR: #272
- Wave 64 branch: `feature/storefront-street-drop-wave64`
- Wave 64 PR base must remain `feature/storefront-editorial-atelier-wave63`

Parallel `main`, production, Visual Builder and Email Builder movement is external to this Storefront stack and must not be rebased or imported into Wave 64.

At reconstruction time GitHub `main` was independently at `64363ac1d134fe8a065bb93dfbce7bbad4479d90` after Visual Builder admin-navigation work. That movement is intentionally not part of this branch.

## Historical hardening inheritance

Historical hardened counterpart: **Wave 45 / PR #227**.

Historical final accepted head:

`cb2be0616055078d1c42de94ebffc2a2b88b8e8c`

Historical Wave 45 contract-first evidence found exactly two Street Drop drifts:

1. obsolete/disallowed top-level release binding namespace `drop.releaseStatus`;
2. duplicate Catalog node ID `street-drop-catalog-header`.

The historical minimal repair changed these to:

- authoritative shared binding `inventory.releaseStatus`;
- unique collection node ID `street-drop-catalog-collection-header`.

No shared runtime allowlist, component registry, commerce authority or binding namespace was widened.

## Byte identity / current drift result

Historical accepted Street Drop template blob at Wave 45 final head:

`d463c6a37cbda3dc00b265b7331049dfaa58ece1`

Current inherited Street Drop template blob at the exact Wave 63 parent:

`d463c6a37cbda3dc00b265b7331049dfaa58ece1`

Result: **byte-identical**.

The current template also visibly retains both accepted historical fixes: release status binds through `inventory.releaseStatus`, and Catalog uses `street-drop-catalog-collection-header`.

Therefore there is no evidence of current-contract drift and Wave 64 must not modify `src/lib/builder/templates/street-drop.ts`, replay the old patch, redesign the template, or create implementation churn merely to produce a diff.

## Accepted Street Drop contract inherited by Wave 64

Street Drop remains the third distinct fashion direction:

- Monarche: balanced modern premium mainstream fashion;
- Editorial Atelier: asymmetric campaign-led editorial fashion;
- Street Drop: aggressive but readable streetwear / sneaker / drop culture.

Protected visual and Builder characteristics remain:

- black + off-white foundation;
- merchant-replaceable neon accent;
- readable characterful display typography plus clean sans UI;
- high-energy Home, ordered Catalog/PDP and restrained checkout;
- separate editable Hero layers: badge, headline, copy, primary CTA, secondary CTA, image;
- separate editable Drop Alert layers: eyebrow, headline, copy, CTA;
- Desktop / Tablet / Mobile responsive editing;
- hierarchy `Template → Page Presets → Section Presets → Components`;
- stable page-local unique node IDs and stable binding paths;
- 14 Alap-compatible Page Schema presets;
- PDP desktop/tablet 7/12 gallery + 5/12 buybox, mobile 12/12 + 12/12.

Shared authority remains fail-closed:

- E1 shared Page Schema/runtime;
- E2 shared discovery/catalog/search eligibility authority;
- E13 shared provider-neutral checkout;
- optional E7 structured facts, E3 guided finder and shared Recommendations;
- scarcity only from inventory authority;
- release status only from authoritative binding;
- no fake countdown, stock count, release state, rating or product truth;
- any future drop/release scheduler must be a shared engine, never template-local.

Installation remains draft-only under demo namespace `fashion-street-drop` and may create storefront page drafts only. It must not mutate product, variant, pricing, inventory, customer, order or B2B authority.

## Minimal Wave 64 batch

Because the canonical template is byte-identical to the accepted hardened Wave 45 version, Wave 64 adds exactly three evidence/acceptance files:

1. `docs/STOREFRONT_STREET_DROP_WAVE64_REACCEPTANCE.md`
2. `src/lib/builder/templates/street-drop-wave64-acceptance.ts`
3. `tests/storefront-street-drop-wave64-reacceptance.test.ts`

`src/lib/builder/templates/street-drop.ts` is intentionally untouched.

The executable Wave 64 contract covers canonical succession, exact parent authority, byte-identical inheritance, historical hardening, visual separation, editable Home layers, shared engine/authority boundaries, authoritative release/scarcity behavior, current binding namespaces, 14 responsive Alap presets, stable unique node IDs, shared 7/12 + 5/12 PDP bindings, draft-only installation and provider-neutral checkout.

The existing Wave 45 historical acceptance and Wave 63 predecessor acceptance remain part of the full quality suite and must stay green on the exact Wave 64 head.

## Read-only infrastructure baseline before implementation

Wave 63 exact-head evidence was rechecked rather than copied from the previous report:

- Wave 63 branch exact head: `9a8b9e0bfe7501af4054ab4353d2f6da4e217378`;
- Draft PR #272: open, Draft, unmerged and mergeable;
- exact-head CI run `34599922623`: SUCCESS;
- quality artifact `10264270016`, digest `063a0b91e69b76ac503a55cf7575a4be9b988d0208abfe47565fdaa8c80b5e14`, downloaded and digest-verified;
- quality result: 564 / 564 suites and 2185 / 2185 tests PASS;
- release artifact `10264020328`, digest `d780e646f0ffc5cf870dff21760e80cb4a9f7b687391810b3a5780d6aa8b8d32`, downloaded and digest-verified;
- release manifest exact SHA `9a8b9e0bfe7501af4054ab4353d2f6da4e217378`;
- Wave 63 releaseHash `fbfcf8420a843f3fe36f9f9ac655d138ccd139eb83cec5b44070d9a350f8c285`;
- Wave 63 Vercel preview `dpl_CUpE2auQPEFYEUbHAEPcq4FKG11P`: READY, target `null`, exact SHA, exact branch, PR #272;
- current production deployment at reconstruction: `dpl_xddHp5CVNUSHDYXpt4gzvWZJZBkT`, READY, target `production`, external main SHA `64363ac1d134fe8a065bb93dfbce7bbad4479d90`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `64363ac1d134`;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging Supabase `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install / `istjjkdcvsvilrycqecd`: `INACTIVE`.

Water-K tenant read-only state at reconstruction:

- id `56ffdbca-0614-4175-8c56-6255d38d7f53`;
- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products `1`;
- variants `3`;
- orders `8`;
- storefront pages `14`;
- storefront page revisions `14`.

The 14 page / 14 revision state is a parallel external change relative to the earlier Wave 63 closure observation of 0 / 0. Wave 64 does not mutate, reconcile or adopt that change as scope.

## Customer baseline boundary

The exact Wave 63 parent still carries customer baseline manifest blob:

`60b6705ec860849c563f6832460e3c7996f4e433`

Manifest contract:

- status `ready`;
- source policy `schema-snapshot-only`;
- default plan `alap`;
- ordered baseline already has genuine empty-target proof;
- `freshInstallProofRequired=false`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 64 introduces no migration or customer-baseline diff. Fresh Install therefore must remain untouched and the CI proof job should be SKIPPED under the existing contract.

## Explicit non-scope

Wave 64 does not authorize:

- a duplicate or redesigned Street Drop template;
- a template-local Builder/layout/drop/release/scarcity/inventory engine;
- shared runtime allowlist, registry or binding namespace widening;
- fabricated price, stock, rating, release, variant, eligibility or order truth;
- SQL/customer-baseline migration;
- Supabase production/staging mutation;
- Fresh Install project lifecycle change;
- Water-K tenant status, plan or business-data mutation;
- K&H/vPOS/payment provider change;
- `main` merge;
- Wave 64 production deployment;
- Wave 65 implementation.

Final CI, artifacts, exact stacked diff, Vercel preview and closure evidence are recorded on the stacked Draft PR after the single Wave 64 commit reaches exact-head acceptance.
