# Storefront Wave 59 — Sport Hub Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 59 is not a new template and does not reorder the accepted Storefront scale-out sequence. Repository and PR history prove the same direct successor after Loot Vault in both relevant chains.

Original scale-out chain:

- Wave 20 / PR #143 — Loot Vault (`gaming.loot-vault`);
- Wave 21 / PR #144 — Sport Hub (`sport.sport-hub`), stacked directly on `feature/storefront-loot-vault-wave20` at exact Loot Vault final SHA `4f31d5a8e725e0ed28c914ce84280257d7001121`;
- Wave 22 / PR #145 — Trail & Expedition, stacked directly on Sport Hub.

Historical re-acceptance chain:

- Wave 39 / PR #213 — Loot Vault Re-acceptance & Builder Hardening;
- Wave 40 / PR #215 — Sport Hub Re-acceptance & Builder Hardening, stacked directly on `feature/storefront-loot-vault-wave39` at exact accepted Wave 39 SHA `2dab503b464c54726e91bbe8b786088035a2150b`;
- Wave 41 / PR #217 — Trail & Expedition Re-acceptance & Builder Hardening, stacked directly on Sport Hub.

Both histories therefore prove `Loot Vault → Sport Hub → Trail & Expedition`. No Storefront release checkpoint, infrastructure wave or other non-template Storefront checkpoint intervenes between Loot Vault and Sport Hub in either chain.

The current replay chain is therefore:

`Creator Station → Spec Lab → Playroom → Loot Vault → Sport Hub`

## Exact stack boundary

- predecessor: Wave 58 — Loot Vault Re-acceptance & Builder Hardening;
- predecessor branch: `feature/storefront-loot-vault-wave58`;
- exact predecessor SHA: `2b7046de0b1b562069cc08c910871108002513b4`;
- Wave 59 branch: `feature/storefront-sport-hub-wave59`;
- required Draft PR base: `feature/storefront-loot-vault-wave58`;
- no merge to `main` and no production deployment are authorized;
- Wave 60 is explicitly outside this wave.

## Canonical template identity

- template: **Sport Hub**;
- canonical key: `sport.sport-hub`;
- version: `1`;
- category: Sport & Outdoor #8;
- role: broad, mainstream, approachable multisport commerce hub;
- historical counterpart: Wave 40 / PR #215;
- original counterpart: Wave 21 / PR #144;
- demo namespace: `sport-sport-hub`;
- minimum plan: `alap`;
- Page Schema presets: 14;
- shared engine contract: `E1 + E2 + E7 + E10 + E13`.

Primary activity-first shopping question:

`Milyen sportot űzöl?`

Accepted baseline entries:

- futás;
- kerékpár;
- fitnesz;
- túra;
- úszás;
- labdajátékok.

Builder-native skill routing remains `Kezdő → Haladó → Profi` and is navigation/presentation only; it does not invent product suitability or performance claims.

Accepted Home order:

`Sport Hub Hero → Shop by Sport → New Season → Footwear & Apparel → Equipment Essentials → Team & Club → Featured Sport → Community Stories → Guides & Advice → Footer`

Sport Hub remains deliberately distinct from Loot Vault collector/drop commerce, Trail & Expedition route-first outdoor commerce and Performance Lab specialist data/performance commerce.

## Historical Wave 40 hardening

Historical Wave 40 was not a no-op. Its current-baseline acceptance exposed and corrected real inherited compatibility drift without widening shared contracts:

1. duplicate Catalog node ID `sport-catalog-header` was removed by renaming the collection heading identity to `sport-catalog-collection-header`;
2. inherited Content `story.index` was not valid on the current shared Content contract and was replaced with shared `story.body`;
3. provisional `story.current.*` Content bindings were outside the shared binding namespace contract and were mapped to existing allowed `content.guideBody.blocks` / `content.guideBody.relations` paths;
4. acceptance metadata remained customer-neutral.

No shared runtime allowlist, component registry or binding namespace was widened.

Historical Wave 40 accepted final HEAD: `3f8f57f760d42c4132e86552eeb3cbc5e6510e44`.

## Byte identity / current drift hypothesis

Before Wave 59 implementation, `src/lib/builder/templates/sport-hub.ts` was read at:

- historical accepted Wave 40 final HEAD `3f8f57f760d42c4132e86552eeb3cbc5e6510e44`;
- current Wave 58 final HEAD `2b7046de0b1b562069cc08c910871108002513b4`.

Both refs resolve to the exact same blob SHA:

`541da1be4031b99f594fdc2b27f5ca60365f1e78`

This is direct byte-level evidence that the historical Wave 40 hardening is already inherited on the current stacked baseline. Wave 59 therefore does not modify `sport-hub.ts` speculatively. A canonical implementation change is allowed only if the executable current-baseline gate proves real drift.

## Current-baseline acceptance contract

Wave 59 must prove:

- canonical `sport.sport-hub` version `1` identity;
- direct current Wave 58 Loot Vault → Wave 59 Sport Hub relationship;
- historical Wave 39 → Wave 40 and original Wave 20 → Wave 21 continuity;
- no intervening Storefront release/infrastructure checkpoint;
- visual and structural distinctness from Loot Vault, Trail & Expedition and Performance Lab;
- exact accepted Home order;
- activity-first question, six accepted sport entries and Builder-native skill routing;
- all 14 Page Schema presets;
- Desktop / Tablet / Mobile compatibility;
- stable, page-local unique node IDs;
- inherited `sport-catalog-collection-header` de-duplication;
- inherited shared Content `story.body` compatibility;
- inherited `content.guideBody.*` shared binding correction;
- current shared binding namespaces only;
- no template-local `sportHub.*`, `sports.*`, `liveScore.*` or `performance.*` truth namespace;
- `Template → Page Presets → Section Presets → Components` hierarchy;
- merchant-editable design tokens;
- marketing copy, CTA, price, stock, performance/team/event/suitability claims remain structured/shared-authority data rather than image-baked authority;
- `alap` entitlement contract;
- draft-only template installation boundary;
- E2 catalog/search/channel/product eligibility authority;
- E7 structured sport/product fact authority only when supplied;
- E10 editorial/story presentation authority;
- E13 provider-neutral checkout/final validation authority;
- product, pricing, inventory, variants, reviews and checkout remain shared-engine authority;
- template switching cannot mutate products, variants, pricing, inventory, customers, orders or B2B authority;
- no fabricated performance claim, team affiliation, event result or sport suitability;
- no template-local sports/live-score/performance/layout/commerce/checkout engine;
- no shared runtime allowlist, component registry or binding namespace widening merely to make the gate pass.

## First batch

Wave 59 first batch contains exactly three new files:

- this canonical reconstruction document;
- `src/lib/builder/templates/sport-hub-wave59-acceptance.ts`;
- `tests/storefront-sport-hub-wave59-reacceptance.test.ts`.

The inherited canonical `src/lib/builder/templates/sport-hub.ts` is intentionally unchanged before the first exact-head acceptance gate.

## Initial external baseline — read only

At Wave 59 start:

- GitHub `main`: `4f6cb87945d55ec527576227eaf82d0b767edc05` — Roadmap Block 23;
- Wave 58 predecessor HEAD: `2b7046de0b1b562069cc08c910871108002513b4`;
- Wave 58 PR #262: Draft, open, unmerged, mergeable;
- Wave 58 CI run `34592468868` / #2797: SUCCESS;
- production Vercel: `dpl_EiwJ4XVS3DzsDZs4vWLfs68t3Kto`, READY, target `production`, exact SHA `4f6cb87945d55ec527576227eaf82d0b767edc05`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `4f6cb87945d5`;
- Wave 58 final preview: `dpl_HosnWeFSbv36uuSHbEr9tK9D3ZcH`, READY, target `null`, exact SHA `2b7046de0b1b562069cc08c910871108002513b4`;
- Wave 58 preview `/api/health`: HTTP 302 Vercel SSO redirect, not an application-smoke PASS;
- `waterk-platform`: `ACTIVE_HEALTHY`;
- `waterk-staging`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install: `INACTIVE`.

The staging/Fresh Install lifecycle values have changed since the Wave 58 closure because of parallel Roadmap Block 24 activity. Wave 59 treats those states as external read-only baseline and does not modify them.

Water-K read-only start invariants:

- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products `1`;
- variants `3`;
- orders `8`;
- storefront pages `0`;
- storefront page revisions `0`.

Customer baseline on exact Wave 58 HEAD:

- status `ready`;
- default plan `alap`;
- `freshInstallProofRequired=false`;
- ordered baseline `0001–0017`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`;
- manifest blob SHA `60b6705ec860849c563f6832460e3c7996f4e433`.

## Boundary

Wave 59 must remain a stacked Draft PR on Wave 58. It does not authorize a `main` merge, production deploy, production/staging Supabase mutation, Fresh Install lifecycle change, Water-K status/plan change, K&H/vPOS/payment behavior change, auth/RLS weakening, Visual Builder or AI Builder roadmap expansion, shared registry widening, or Wave 60 implementation.
