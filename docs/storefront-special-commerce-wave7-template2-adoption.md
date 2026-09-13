# Special Commerce Wave 7 — Template 2.0 Adoption & Rollout

## Canonical scope

Wave 7 adopts the already accepted Special Commerce launch surface into Template 2.0. It does **not** create a new commerce engine, Page Schema, renderer, checkout, entitlement authority, pricing/inventory authority or database authority.

Base: Special Commerce Wave 6 exact final HEAD `87444a716742b0ce81b3cc52db86023ebf973633`.

The template remains layout/design/preset authority only. Special Commerce remains shared Builder/runtime capability and continues to use the canonical catalog, cart, quote, checkout, order and Product Media paths.

## Repository inventory — launch target versus reality

The accepted launch target is 42 templates, but the Wave 6 exact source-controlled catalog contains **24 concrete installable Template 2.0 packages**. The catalog itself exposes `fabricatedEntriesAllowed:false`; therefore Wave 7 must not invent the missing 18 packages merely to satisfy cardinality.

`src/lib/builder/storefront-special-commerce-template2-adoption.ts` derives its machine-verifiable inventory directly from `STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES`. For every real package it records:

- template key and display name;
- category (the template-key prefix);
- template version and Page Schema version;
- declared page types;
- shared Builder-registry connection;
- shared runtime-renderer contract;
- current commerce-component usage found by traversing the actual Page Schema documents;
- Special Commerce use cases enabled by this Wave 7 policy.

Current status: **24 implemented / 42 target / 18 missing**. Formal 42-template closure is therefore blocked by portfolio availability, not by fabricating placeholder templates.

## Shared capability authority

The policy references only existing production component keys:

- Scene: `commerce.interactive-scene`;
- Room: the same Interactive Scene component plus `composer.builder` — no room engine;
- Recipe: `commerce.recipe`;
- Release: `commerce.release`;
- Finder: `guided.finder` + `guided.results`;
- Composer: `composer.builder`;
- Configurator: `configurator.builder` + `configurator.slot-list`;
- Compatibility: `compatibility.status` + `compatibility.evidence`.

Alap/Pro truth is **not duplicated** in the matrix. `getStorefrontSpecialCommerceCapabilityRequirement()` resolves minimum plan and required feature codes from the real shared Builder component manifests. Missing/revoked entitlement therefore continues to fail closed through the existing Page Schema validator.

E6 compatibility keeps the existing rule: no explicit rule/evidence means `unknown`; template identity, prose, product name and AI output are never compatibility evidence. Finder/Configurator/Compatibility remain dependent on explicit E7 structured product evidence.

## Template × Special Commerce capability matrix

Markers: `required`, `supported`, `optional`, `not applicable`. `Plan = manifest` means the real component manifest is authoritative for Alap/Pro and features.

| Template | Category | Scene | Room | Recipe | Release | Finder | Composer | Configurator | Compatibility | Plan |
|---|---|---|---|---|---|---|---|---|---|---|
| Alpine Lodge | outdoor | supported | not applicable | not applicable | optional | supported | supported | optional | optional | manifest |
| Beauty Lab | beauty | supported | not applicable | not applicable | optional | required | optional | optional | not applicable | manifest |
| Creator Station | creator | optional | not applicable | not applicable | required | not applicable | supported | not applicable | not applicable | manifest |
| Derma Studio | beauty | optional | not applicable | not applicable | optional | required | optional | optional | not applicable | manifest |
| Editorial Atelier | fashion | required | not applicable | not applicable | optional | optional | supported | not applicable | not applicable | manifest |
| Gallery Edit | home | required | required | not applicable | not applicable | optional | required | supported | optional | manifest |
| Heritage Atelier | jewelry | supported | not applicable | not applicable | optional | optional | supported | supported | optional | manifest |
| Loot Vault | gaming | optional | not applicable | not applicable | required | supported | supported | optional | optional | manifest |
| Market Pantry | food | optional | not applicable | required | optional | optional | supported | not applicable | not applicable | manifest |
| Modern Luxe | jewelry | supported | not applicable | not applicable | optional | optional | supported | supported | optional | manifest |
| Monarche | fashion | required | not applicable | not applicable | supported | optional | supported | not applicable | not applicable | manifest |
| My Pack | pet | not applicable | not applicable | not applicable | optional | required | supported | optional | optional | manifest |
| Performance Lab | sport | optional | not applicable | not applicable | optional | required | supported | optional | optional | manifest |
| Playroom | gaming | optional | not applicable | not applicable | supported | supported | supported | optional | optional | manifest |
| Rig Forge | gaming | optional | not applicable | not applicable | supported | required | required | required | required | manifest |
| Ritual House | beauty | supported | not applicable | not applicable | optional | required | supported | optional | not applicable | manifest |
| Spec Lab | tech | optional | not applicable | not applicable | supported | required | supported | required | required | manifest |
| Sport Hub | sport | optional | not applicable | not applicable | optional | required | supported | optional | optional | manifest |
| Statement Lab | fashion | required | not applicable | not applicable | supported | optional | supported | not applicable | not applicable | manifest |
| Street Drop | fashion | supported | not applicable | not applicable | required | optional | supported | not applicable | not applicable | manifest |
| Table Gift | food | optional | not applicable | supported | optional | optional | required | not applicable | not applicable | manifest |
| Tech Deck | tech | optional | not applicable | not applicable | supported | required | supported | required | required | manifest |
| Tool Depot | industrial | optional | not applicable | not applicable | optional | required | required | required | required | manifest |
| Trail Expedition | outdoor | supported | not applicable | not applicable | optional | required | supported | optional | optional | manifest |

The executable matrix is keyed by the real template-key slug and is fail-fast: if a new source-controlled package appears without an adoption policy, module initialization throws `WAVE7_TEMPLATE_POLICY_MISSING` rather than silently treating it as adopted.

## Builder / preset adoption

No template-local JSX engine is introduced. The matrix points at valid shared Page Schema components already registered in the Visual Builder and shared renderer registry. Merchant-managed selectors (scene, recipe, release, finder, composer and configurator identities) remain outside generic free-form config, so no raw JSON authoring path is introduced.

The existing Builder supports component insertion, move/reorder, responsive overrides, configuration selectors, saved blocks and preset application. Wave 7 treats Special Commerce adoption as recommended shared-component composition; template files do not gain a second runtime or checkout branch.

## Template switching and cross-template isolation

The existing `STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY` remains authoritative: template operations may materialize storefront page drafts, but do not mutate products, variants, customers, orders or business content. Special Commerce merchant definitions and E7 product evidence are not stored under the template ID and are not rewritten by this adoption policy.

Stable Page Schema node identities, draft/published persistence and tenant scope continue to be enforced by the existing Builder/persistence/runtime layers. Wave 7 adds no database table or migration.

## Responsive, accessibility and security

All adopted components continue to use the common Desktop → Tablet → Mobile inheritance contract. There is no mobile-specific commerce logic.

The Wave 6 shared renderers remain responsible for semantic controls, keyboard/focus behavior and live status copy. Wave 7 adds no template-specific interactive renderer. Binding paths remain allowlisted and prototype-pollution segments remain rejected. Interactive Scene retains bounded hotspots and safe-href validation; Release retains server-time/shared-stock authority; Recipe claims and Compatibility remain evidence-only.

## Performance / hydration

No per-template Special Commerce bundle or cache is added. All 24 actual packages reference the same component and renderer registries. The Wave 6 shared Scene catalog projection continues to be reused by E3–E5 rather than fetched once per template or engine. No client clock is allowed to determine release commerce markup.

## Cart / checkout regression boundary

Template identity never becomes checkout metadata authority. Ordinary cart lines, Composer groups, Recipe intents, Room/Composer groups and Configurator groups remain on the shared cart/quote/order path. `place_order_provider_v6_idempotent` remains the wrapper over the existing v5 authoritative checkout/database path; Wave 7 introduces no v7 order RPC and no inventory-decrement path.

## Automated acceptance

`tests/special-commerce-wave7-template2-adoption.test.ts` binds to production code and verifies:

1. actual catalog cardinality and the 42-target gap without fabrication;
2. common Page Schema contract across every real package;
3. common Builder registry and renderer registry;
4. matrix coverage equals the real catalog exactly;
5. every referenced Special Commerce component key exists in production registries;
6. no template-specific renderer branch is required;
7. manifest-derived Alap/Pro behavior and missing-entitlement fail-closed behavior;
8. managed-selector isolation / no generic raw JSON contract;
9. template-switch commerce-state mutation boundary;
10. stable section identities;
11. common Desktop/Tablet/Mobile inheritance;
12. Compatibility `unknown` fail-closed behavior;
13. shared Scene catalog projection reuse;
14. shared cart/checkout authority;
15. shared media components through the common Builder registry;
16. no template pricing/inventory authority;
17. continued shared accessibility ownership;
18. Wave 6 bounded-input/safe-link/security regression coverage;
19. duplicate catalog-projection guard through the shared runtime-source contract;
20. no new database authority or migration.

## Migration status

**NO NEW MIGRATION.** Production Supabase remains read-only for Wave 7. Staging mutation is unnecessary unless exact-head engineering gates expose a real schema gap.

## Closure semantics

Wave 7 can be engineering-green for the **actual source-controlled Template 2.0 portfolio** while the formal 42-template launch statement remains blocked until the missing 18 real template packages exist on the canonical stack. The blocker must be reported as a portfolio-count gap, never hidden with fabricated inventory.

Production rollout and `main` merge remain explicit non-scope.
