# Storefront Wave 58 — Loot Vault Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 58 is not a new template and does not reorder the accepted Storefront scale-out sequence. Repository and PR history prove the same direct successor after Playroom in both relevant chains.

Original scale-out chain:

- Wave 19 / PR #142 — Playroom (`gaming.playroom`);
- Wave 20 / PR #143 — Loot Vault (`gaming.loot-vault`), stacked directly on `feature/storefront-playroom-wave19` at exact Playroom final SHA `3d62a1da93d10b89ff855a86ee1971ab4dd6fea7`.

Historical re-acceptance chain:

- Wave 38 / PR #210 — Playroom Re-acceptance & Builder Hardening;
- Wave 39 / PR #213 — Loot Vault Re-acceptance & Builder Hardening, stacked directly on `feature/storefront-playroom-wave38` at exact accepted Wave 38 SHA `d884d80686ccb6793eb74a486488d631b797bd01`.

PR #213 explicitly records the accepted sequence `Playroom → Loot Vault → Sport Hub`, while PR #143 independently proves the original direct `Playroom → Loot Vault` transition. No Storefront release checkpoint, infrastructure wave, or other non-template checkpoint intervenes between Playroom and Loot Vault in either chain.

Therefore the repository-proven current successor after Wave 57 Playroom is **Wave 58 — Loot Vault Re-acceptance & Builder Hardening**.

## Exact stack boundary

- predecessor: Wave 57 — Playroom Re-acceptance & Builder Hardening;
- predecessor branch: `feature/storefront-playroom-wave57`;
- exact predecessor SHA: `d385550d92b2c85b1672b824407076662fffd0fb`;
- Wave 58 branch: `feature/storefront-loot-vault-wave58`;
- required Draft PR base: `feature/storefront-playroom-wave57`;
- no merge to `main` and no production deployment are authorized;
- Wave 59 is explicitly outside this wave.

## Canonical template identity

- template: **Loot Vault**;
- canonical key: `gaming.loot-vault`;
- version: `1`;
- category: Gaming & Geek;
- role: collector / merch / edition / drop / preorder-oriented storefront;
- historical counterpart: Wave 39 / PR #213;
- original counterpart: Wave 20 / PR #143;
- demo namespace: `gaming-loot-vault`;
- minimum plan: `alap`;
- Page Schema presets: 14.

Accepted Home order:

`Vault Hero → Universe Selector → Limited / Exclusive / Preorder → Collector Selection → Vault Feature → Drop Alert → Join the Hunt → Footer`

`Collector Selection` remains the largest commerce surface.

Loot Vault is deliberately distinct from Playroom broad gaming discovery and Rig Forge PC build/configuration. It may present genuine collector facts, editions, rarity, preorder or release state only when shared authoritative product/catalog/commerce/inventory data supplies them.

## Historical Wave 39 hardening

Historical Wave 39 was not a no-op. Its first current-baseline gate identified two separate issues:

1. the initial acceptance harness incorrectly validated Loot Vault's legitimate `story.*` E10 components against the Configurator registry; repository history proved the test assumption wrong, so the gate was corrected to use the shared Story registry without widening any shared registry or allowlist;
2. the Catalog page contained a real duplicate node ID because `header('loot-catalog')` and the adjacent collection section both resolved to `loot-catalog-header`. The canonical template was corrected by renaming only the section identity to `loot-catalog-collection-section`.

The accepted Wave 39 final HEAD is `2dab503b464c54726e91bbe8b786088035a2150b`.

## Byte identity / current drift hypothesis

Before Wave 58 implementation, `src/lib/builder/templates/loot-vault.ts` was read at:

- historical accepted Wave 39 final HEAD `2dab503b464c54726e91bbe8b786088035a2150b`;
- current Wave 57 final HEAD `d385550d92b2c85b1672b824407076662fffd0fb`.

Both refs resolve to the exact same blob SHA:

`96d3f1a5cdcee73387c042f489e2225a831283f7`

This is direct byte-level evidence that the historical Wave 39 node-ID hardening is already inherited on the current stacked baseline. Wave 58 therefore does not modify `loot-vault.ts` speculatively. A canonical implementation change is allowed only if the executable current-baseline gate proves real drift.

## Current-baseline acceptance contract

Wave 58 must prove:

- canonical `gaming.loot-vault` version `1` identity;
- direct Wave 57 Playroom → Wave 58 Loot Vault relationship;
- historical Wave 38 → Wave 39 and original Wave 19 → Wave 20 continuity;
- no intervening Storefront release/infrastructure checkpoint;
- visual and structural distinctness from Playroom and Rig Forge;
- exact accepted Home order and collector position;
- all 14 Page Schema presets;
- Desktop / Tablet / Mobile compatibility;
- stable, page-local unique node IDs;
- inherited `loot-catalog-collection-section` de-duplication;
- current shared binding namespaces only;
- no template-local `lootVault.*`, `drop.*`, `release.*` or `rarity.*` truth namespace;
- `Template → Page Presets → Section Presets → Components` hierarchy;
- merchant-editable design tokens;
- copy, CTA, price, rarity, scarcity, evidence and release state remain structured/shared-authority data rather than image-baked authority;
- `alap` entitlement contract;
- draft-only template installation boundary;
- E2 catalog/search/channel/product eligibility authority;
- E7 structured collector fact authority;
- E10 editorial/story presentation authority;
- E13 provider-neutral checkout/final validation authority;
- product, pricing, inventory, variants, reviews and checkout remain shared-engine authority;
- template switching cannot mutate products, variants, pricing, inventory, customers, orders or B2B authority;
- no loot-box/gambling mechanics;
- no fabricated scarcity, countdown, stock, rarity, exclusivity, numbering, preorder or release state;
- Collection Tracker remains deferred from v1;
- no template-local collector/drop/release/layout/commerce/checkout engine;
- no shared runtime allowlist, component registry or binding namespace widening merely to make the gate pass.

## First batch

Wave 58 first batch contains exactly three new files:

1. `docs/STOREFRONT_LOOT_VAULT_WAVE58_REACCEPTANCE.md`;
2. `src/lib/builder/templates/loot-vault-wave58-acceptance.ts`;
3. `tests/storefront-loot-vault-wave58-reacceptance.test.ts`.

The canonical `src/lib/builder/templates/loot-vault.ts` remains unchanged in this first batch. There is no SQL/customer-baseline migration and no shared runtime, registry or binding change.

The inherited Wave 39 executable gate remains part of the full suite. The new Wave 58 gate verifies the same canonical package against the current shared baseline plus the current sequence and non-scope boundaries. If the exact first-head CI is green, no second hardening commit/build is warranted.

## Initial operational baseline

Read-only checks before Wave 58 confirmed:

- GitHub `main`: `4f6cb87945d55ec527576227eaf82d0b767edc05` — Roadmap Block 23;
- Wave 57 branch exact HEAD: `d385550d92b2c85b1672b824407076662fffd0fb`;
- PR #259: open, Draft, unmerged, mergeable; base `feature/storefront-spec-lab-wave56`; head exact Wave 57 SHA;
- Wave 57 CI run `34590664390` / #2785: completed SUCCESS on exact Wave 57 SHA;
- production Vercel deployment: `dpl_EiwJ4XVS3DzsDZs4vWLfs68t3Kto`, READY, `target=production`, exact SHA `4f6cb87945d55ec527576227eaf82d0b767edc05`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `4f6cb87945d5`;
- Wave 57 preview: `dpl_HoaHYSpZm8ix2DGeoViWmZFcUYVT`, READY, `target:null`, exact SHA `d385550d92b2c85b1672b824407076662fffd0fb`;
- Wave 57 preview `/api/health`: HTTP 302 Vercel SSO redirect, not an application-smoke PASS;
- `waterk-platform`: `ACTIVE_HEALTHY`;
- `waterk-staging`: `INACTIVE` at Wave 58 start;
- Shoperation Fresh Install: `ACTIVE_HEALTHY` at Wave 58 start;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, products `1`, variants `3`, orders `8`, Storefront pages `0`, Storefront page revisions `0`;
- customer baseline manifest on the Wave 57 stack: `status=ready`, `freshInstallProofRequired=false`, ordered baseline `0001–0017`, proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`, manifest blob SHA `60b6705ec860849c563f6832460e3c7996f4e433`.

The staging/Fresh Install project-state difference versus the Wave 57 closing report is treated as an external parallel change. Wave 58 does not mutate either project and does not activate/deactivate Fresh Install.

## Explicit non-scope

Wave 58 does not authorize:

- `main` merge;
- production deployment;
- production or staging Supabase mutation;
- Fresh Install project activation/deactivation;
- Water-K status/plan mutation;
- K&H/vPOS/payment behavior change;
- auth/RLS/security weakening;
- new collector, drop, preorder, release, layout, commerce, checkout or payment authority;
- shared registry/allowlist/binding widening;
- additional Visual Builder or AI Builder roadmap implementation;
- Wave 59 implementation.
