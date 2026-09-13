# Shoperation Visual Builder — UI Fidelity / Production Polish

Status: implementation / Product Owner visual acceptance pending.

## Verified production baseline

Read-only baseline captured before implementation:

- GitHub `main`: `c21c1f29dc3cce586ae4c47061c854ab9afa7256`;
- Vercel production project: `water-k-native`;
- production deployment: `dpl_DTzVGQGB6oeG1YEKnyPyfEdR1gaH`;
- production deployment Git SHA: `c21c1f29dc3cce586ae4c47061c854ab9afa7256`;
- production `/api/health`: HTTP 200, application `status=ok`, database `status=ok`;
- production Supabase: `waterk-platform` / `ewdederyvnwmghlydbno`, `ACTIVE_HEALTHY`;
- Builder route: `/admin/tartalom/builder`.

No production Supabase mutation is part of this block.

## Product authority

This block implements the already-approved Shoperation Visual Builder workspace direction. It is not a redesign and does not introduce a second Page Schema, renderer, Builder operation authority, publication state machine, responsive authority, preset authority, Saved Blocks authority, symbol authority, Global Styles authority or commerce authority.

The existing `StorefrontRuntimeRenderer`, canonical component/renderer registries, Builder mutations, Fidelity engine/diagnostics and draft/save/preview/publish/rollback actions remain authoritative.

AI Builder remains dark-launched and absent from merchant navigation.

## Implemented polish

- production-oriented workspace design tokens, spacing, typography, surfaces and focus states;
- clearer top-toolbar hierarchy with Publish retained as the primary CTA;
- refined left navigation and contextual libraries;
- searchable Pages surface;
- component library categories including a reserved `Interaktív kereskedelem` group;
- Layers status cues for linked, protected and viewport-hidden nodes using existing schema/metadata;
- canvas-first visual hierarchy, breakpoint context and compact floating element toolbar;
- merchant-facing inspector presentation and progressive Normal/Advanced disclosure;
- Smart Quick Settings mapped directly to existing configurable token/alignment keys;
- explicit responsive inheritance / override cues and `Reset to inherited` through the existing responsive mutation contract;
- Publish Readiness presentation expanded into Images, Links/CTA and Required Content views by grouping existing Fidelity accessibility diagnostics rather than creating new scanners;
- collapsible left panel / inspector controls for constrained viewports;
- small-viewport drawer behavior, minimum canvas width and toolbar resilience;
- reduced-motion handling and focus-visible treatment.

## Non-goals preserved

No schema migration, database mutation, arbitrary HTML/CSS/JS editor, duplicate storefront renderer, hidden responsive duplicate DOM, AI merchant UI, new commerce state, or new publication authority.

## Regression gate

The existing Builder workspace regression contract continues to prove the canonical operations and authorities. This block extends that contract with checks for searchable pages, interactive-commerce library preparation, linked/protected layer cues, responsive inheritance/reset UX, progressive disclosure, panel collapse behavior and reduced-motion/focus support.

Required before merge:

1. exact-head GitHub CI PASS;
2. production build PASS in CI;
3. Vercel preview READY for the exact branch head;
4. authenticated visual acceptance evidence for default Builder, Add, Layers, selected inspector, Mobile/Responsive, Global Styles, Presets, Saved Blocks and Publish Readiness;
5. Product Owner visual PASS.

Until those gates are complete this branch must not be merged to `main` or promoted to production.
