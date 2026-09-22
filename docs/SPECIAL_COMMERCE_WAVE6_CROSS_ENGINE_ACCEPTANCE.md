# Special Commerce Wave 6 — Cross-Engine Acceptance

## Purpose

Wave 6 is the shared acceptance and hardening gate for the launch-blocking Special Commerce surface. It does **not** introduce another commerce engine, another Page Schema, another renderer authority or another database authority.

Wave 6 remains stacked on **Wave 5 — Existing Engine Closure**. It must stay a Draft PR and does not authorize a `main` merge, production deployment or production database mutation.

## Accepted launch surface under test

The cross-engine gate covers the already accepted shared implementations:

- Interactive Scene / Shop the Look and the Room / Scene specialization;
- Recipe Commerce with explicit allergen/diet evidence;
- Drop / Release Commerce;
- E3 Guided Finder;
- E4 Multi-Product Composer;
- E5 Product Configurator;
- E6 Compatibility;
- E7 structured specification / compare surface.

Room / Scene remains a specialization of Interactive Scene plus the existing E4 Composer. Wave 6 does not create a separate room engine.

## Canonical cross-engine invariants

### One Builder and runtime contract

Every accepted customer-facing component must resolve through the real shared Visual Builder component registry and the shared storefront renderer path. Builder, preview and published pages continue to use the same Page Schema/runtime contract.

E3/E4/E5/E6 keep their Wave 5 architecture: generic shared renderers are decorated by `StorefrontRuntimeRenderer` with the real existing-commerce runtime. A component is not accepted merely because it exists in the Builder registry; the runtime path must also be present.

### Entitlements fail closed

The runtime validates the capability declared by the actual component manifest. A component with missing required features must fail `COMPONENT_CAPABILITY_REQUIRED`; Pro-only components must also fail on an Alap plan even if a caller supplies the feature name.

This gate does not add a second entitlement table or hard-coded acceptance entitlement matrix to production code.

### Merchant-managed selectors stay managed

Scene, recipe, release, finder, composer and configurator identity/configuration selectors remain managed by their dedicated merchant controls. They must not reappear as generic free-form structured editing fields.

No raw JSON authoring is introduced by Wave 6.

### One responsive and binding-security model

All accepted engines use the same isolated Desktop / Tablet / Mobile Page Schema authority: base plus the exact active viewport, with no sibling-viewport override inheritance. Binding paths continue to use the allowlisted namespace/path resolver and reject prototype-pollution path segments.

### No duplicate commerce authority

Special Commerce remains a composition/read/presentation layer. It does not own:

- catalog truth;
- pricing truth;
- inventory truth;
- cart authority;
- checkout authority;
- order authority;
- payment authority.

Interactive Scene, Recipe and Release expose explicit non-authority contracts. Existing E3/E4/E5/E6 continue to project tenant-scoped catalog evidence and use the canonical cart/checkout/order paths established before Wave 6.

### Bounded inputs and safe links

Launch engines must keep explicit bounds on merchant-authored collections. The cross-engine suite locks the current key limits, including Interactive Scene hotspots, Recipe ingredients, Release items and Guided Finder result count. Interactive Scene also remains fail-closed for unsafe product links.

### Anti-fake / evidence rules

- Release availability is derived from the persisted server-side release window and real shared stock; client time cannot unlock commerce.
- Recipe allergen/diet claims are never inferred from prose or model output.
- Compatibility without explicit rules/evidence is `unknown`, not compatible.
- `catalog.limited` remains deliberately fail-closed until a genuine shared inventory-scarcity authority exists; Wave 6 must not invent a marketing threshold.

## Automated acceptance suite

`tests/special-commerce-wave6-cross-engine-acceptance.test.ts` validates the real current contracts rather than a parallel production metadata registry. It checks:

1. accepted component presence in the shared Builder and renderer registries;
2. manifest-backed plan/feature fail-closed behavior;
3. managed-selector isolation from generic editing;
4. responsive inheritance and binding-path security;
5. non-authority contracts and canonical checkout separation;
6. bounded payloads and unsafe-link rejection;
7. release anti-fake and compatibility fail-closed evidence.

## Engineering acceptance gates

The exact Wave 6 HEAD must pass the repository's normal gates:

- dependency/security audit;
- customer-baseline guard;
- Block 24 contract gate;
- full quality tests;
- TypeScript;
- production build;
- release manifest;
- exact-head Vercel preview build.

Fresh Install may remain **SKIPPED** on the ordinary Wave branch. A skipped workflow must never be reported as PASS.

Because Wave 6 does not currently require a database migration, no staging schema mutation is justified merely to produce acceptance evidence. Staging checks should remain read-only unless the automated suite exposes a genuine database/runtime gap that requires a correction.

## Evidence limits

A protected Vercel preview behind SSO may prove deployment readiness but does not by itself prove public `/api/health` access or visual product-owner acceptance. Those items remain unclaimed until actually observable.

Production remains untouched until explicit release authorization.

## Explicit non-scope

Wave 6 does not add:

- a new Special Commerce engine;
- a second Page Schema or renderer;
- a second pricing, stock, cart, checkout, order or payment authority;
- inferred compatibility, allergen or dietary claims;
- synthetic scarcity thresholds;
- AR/advanced 3D/exploded-view authority;
- production rollout;
- `main` merge.

After this gate is accepted, the next roadmap stage is **Wave 7 — Template 2.0 acceptance over the 42-template portfolio**.