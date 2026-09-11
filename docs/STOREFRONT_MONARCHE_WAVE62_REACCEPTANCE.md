# Storefront Wave 62 — Monarche Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 62 is the repository-proven direct successor to Wave 61 Performance Lab. It is not a newly invented template or checkpoint.

Two independent ordering chains agree:

1. **Original scale-out:** PR #146 — Wave 23 Performance Lab (`sport.performance-lab`) → PR #147 — Wave 24 Golden #1 Monarche (`fashion.monarche`), with PR #147 based directly on the Performance Lab branch/head.
2. **Historical re-acceptance:** PR #220 — Wave 42 Performance Lab Re-acceptance → PR #222 — Wave 43 Monarche Re-acceptance, stacked directly on Wave 42.

Repository documentation (`STOREFRONT_MONARCHE_WAVE24.md` and `STOREFRONT_MONARCHE_WAVE43_REACCEPTANCE.md`) records the same sequence. No release, infra, Builder, runtime or reconciliation checkpoint is recorded between these two templates.

Canonical current sequence:

`Wave 61 Performance Lab → Wave 62 Monarche`

## Exact stack boundary

- predecessor branch: `feature/storefront-performance-lab-wave61`;
- exact predecessor SHA: `380b45b97ffebfdfc1968e418efd2ba2ac8a8b08`;
- Wave 62 branch: `feature/storefront-monarche-wave62`;
- required Draft PR base: `feature/storefront-performance-lab-wave61`;
- branch is intentionally not based on `main`;
- parallel `main` movement is external and must not be imported;
- no merge to `main` or production deployment is authorized;
- Wave 63 is outside this wave.

## Canonical template identity

- template: **Golden #1 Monarche**;
- canonical key: `fashion.monarche`;
- version: `1`;
- category: Fashion & Apparel;
- portfolio role: balanced modern premium mainstream;
- original counterpart: Wave 24 / PR #147;
- historical hardened counterpart: Wave 43 / PR #222;
- demo namespace: `fashion-monarche`;
- minimum plan: `alap`;
- Page Schema presets: 14;
- engine contract: `E1 + E2 + E10 + E13`, optional `E7`.

Protected Home order:

`Editorial Hero → Collection Navigation → New Arrivals → Editorial Split Feature → Product Story Grid → Featured Collection → Social Proof/Reviews → Journal Preview → Newsletter → Footer`

Protected PDP composition:

- desktop/tablet gallery: 7/12;
- desktop/tablet buybox: 5/12;
- mobile gallery and buybox: 12/12.

## Historical accepted hardening

Wave 43 used a contract-first gate and found no inherited current-contract drift in the accepted Monarche package. It therefore intentionally did not modify `src/lib/builder/templates/monarche.ts`.

The accepted contract preserved:

- shared Page Schema / responsive grid authority;
- stable node IDs and binding paths;
- the shared-header boundary `shared-header-extension-required-no-template-specific-child-hack`;
- E2 discovery authority;
- E10 editorial authority;
- optional source-supplied E7 structured facts;
- shared provider-neutral E13 checkout;
- shared review authority with no fabricated default score;
- draft-only installation;
- no template-local pricing, inventory, payment or order authority;
- no shared runtime/registry/binding widening.

Historical accepted implementation head:

`0d6383b238da704edec81789d1cc0cc6526b6e90`

## Byte identity / drift result

Historical accepted Monarche blob at the Wave 43 accepted implementation head:

`8725b711ae20212318cebba2a2f7691f8feadaf0`

Current inherited Monarche blob at exact Wave 61 parent `380b45b97ffebfdfc1968e418efd2ba2ac8a8b08`:

`8725b711ae20212318cebba2a2f7691f8feadaf0`

The blobs are byte-identical. Therefore Wave 62 does **not** modify the canonical Monarche template, does not replay historical patches, and does not create speculative visual/runtime churn.

## Wave 62 acceptance contract

The executable gate re-proves:

- canonical direct succession from current Wave 61;
- historical PR #146 → #147 and Wave 42 → Wave 43 ordering;
- exact parent SHA authority;
- byte-identical canonical template inheritance;
- balanced modern premium Monarche visual identity;
- merchant-editable design tokens;
- protected shared-header direction;
- exact ten-part Home sequence and independently editable hero/split layers;
- all 14 Alap-compatible Page Schema presets;
- Desktop / Tablet / Mobile shared responsive grid;
- page-local unique node IDs;
- current shared registry and binding namespace compatibility;
- protected 7/12 + 5/12 PDP;
- E1/E2/E10/E13 shared authority with optional E7 source facts;
- provider-neutral checkout;
- draft-only `fashion-monarche` installation;
- no fabricated product/commerce authority;
- no SQL/customer-baseline change;
- no Supabase mutation;
- no K&H/vPOS/payment authority change;
- no Water-K tenant mutation;
- no `main` merge;
- no production deployment;
- no Wave 63 implementation.

## Initial external baseline — read only

At Wave 62 reconstruction time:

- GitHub `main`: `fee29f79a230476b8f912338edf1f9ee1f04f7c8`;
- Wave 61 branch HEAD: `380b45b97ffebfdfc1968e418efd2ba2ac8a8b08`;
- Wave 61 Draft PR #267: open, Draft, unmerged, mergeable;
- Wave 61 exact-head CI run `34596552957`: SUCCESS;
- Wave 61 quality artifact `10262158826`, digest `sha256:5fbbc66b862ca3c69e509c2f4b08e8c5bb8a2c24f8511487d92c2bf7abff74dc`;
- Wave 61 release artifact `10261948926`, digest `sha256:60444e3babee0361b82d2ac9dbc19a145073dc5a4043ef378bda64fa5aa6b8a2`;
- production Vercel `dpl_9tV8erbUSusERcdeP7P2BRRuF4ZH`: READY, target `production`, SHA `fee29f79a230476b8f912338edf1f9ee1f04f7c8`;
- Wave 61 preview `dpl_D78NNCZa2EQNZYX95NYCD8gern7P`: READY, target `null`, exact Wave 61 SHA and branch;
- Wave 61 preview `/api/health`: Vercel SSO / Deployment Protection returns HTTP 302, therefore it is **SSO-blocked**, not an application-smoke PASS;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `fee29f79a230`;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging Supabase `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install / `istjjkdcvsvilrycqecd`: `INACTIVE`.

Water-K read-only invariants:

- instance id `56ffdbca-0614-4175-8c56-6255d38d7f53`;
- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products `1`;
- variants `3`;
- orders `8`;
- storefront pages `0`;
- storefront page revisions `0`.

Wave 61 stacked customer baseline manifest:

- status `ready`;
- source policy `schema-snapshot-only`;
- default plan `alap`;
- `freshInstallProofRequired=false`;
- proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`;
- manifest blob SHA `60b6705ec860849c563f6832460e3c7996f4e433`.

No production, staging, Fresh Install, tenant, payment or customer-baseline mutation was performed during reconstruction.

## First batch

The minimal first batch adds exactly three files:

- this reconstruction/evidence document;
- `src/lib/builder/templates/monarche-wave62-acceptance.ts`;
- `tests/storefront-monarche-wave62-reacceptance.test.ts`.

The canonical `src/lib/builder/templates/monarche.ts` remains byte-identical and untouched.

## Boundary

Wave 62 remains a stacked Draft PR on Wave 61. It does not authorize shared authority widening, `main` merge, production deployment, Supabase mutation, Fresh Install lifecycle change, Water-K tenant change, K&H/vPOS/payment change, customer-baseline migration or Wave 63 implementation.
