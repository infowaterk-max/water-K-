# Shoperation — Visual Fidelity Pilot 01: Beauty Lab

Canonical template: `beauty.beauty-lab` v1.

## Visual authority

The visual authority for this pilot is the previously approved Beauty Lab generated mockup supplied by the product owner. It is treated as a visual specification, not inspiration. The runtime implementation remains Page Schema driven and does not embed the mockup as a background image or raw HTML/JS.

The implementation deliberately uses replaceable photographic demo imagery rather than the former primitive `formula.svg`, `ingredient.svg` and `texture.svg` compositions. Merchant/product imagery remains data/binding driven; no marketing copy, prices or claims are baked into image assets.

## Read-only baseline

At pilot start:

- GitHub `main`: `a3d07329be09a531082dd4da5ac89e1d7ecdb332`.
- Vercel production was READY on the same Git SHA.
- `main` contained 24 concrete Storefront template packages, not 25/42.
- PR #289 `planning/storefront-42-portfolio-recovery`: open Draft planning/stack base.
- PR #290 `feature/storefront-warm-minimal-portfolio25`: open Draft stacked on #289; it represents the 25th template but is not on `main`.
- Beauty Lab v1 already had 14 Page Schema page types and technical re-acceptance evidence, but the homepage used three very small primitive SVG demo assets and the previous technical acceptance did not prove visual fidelity.
- Template Library preview and Visual Builder already shared `StorefrontRuntimeRenderer` plus the shared component/renderer registries. However, Template Library preview applied per-template design tokens while the Builder canvas and immutable Builder preview did not. That theme divergence was a real shared-authority fidelity defect.

## Canonical visual-fidelity delta closure

| Area | Baseline delta | Pilot resolution |
| --- | --- | --- |
| Header/navigation | Generic storefront header | Shared `editorial-lab` header/navigation presentation, Beauty Lab brand/tagline, utility actions and compact mobile treatment |
| Hero | Primitive SVG composition, generic hierarchy | Photo-dominant layered canvas with independent photo, cream copy panel, editorial title, CTA, product inset and clean-beauty badge |
| Title treatment | Generic heading | `YOUR SKIN. YOUR FORMULA.` editorial display treatment through reusable heading presentation |
| Trust/USP | Missing canonical rhythm | Dedicated trust bar plus four-item USP row using shared layout primitives |
| Formula Finder | Technically functional but generic | Shared `editorial-choice-grid` presentation with photo aside and responsive 5/3/2 choice geometry |
| Skin goal / concern | Generic collection navigation | Six-image skin-goal editorial navigation |
| Ingredient Index | Generic attribute cards | Shared `media-index` presentation with image-led ingredient cards |
| Texture Lab | Generic chips | Shared `media-navigation` image-led texture cards |
| Product grid | Generic cards | Beauty Lab card presentation, 4:5 imagery, badges, price/compare-at and CTA; responsive 6/3/2 grid |
| Routine/editorial | Generic content | Photographic Build Your Routine and Ingredient Story split features |
| PDP gallery | Generic gallery | Reusable `editorial-thumbnails` 7/12 gallery with mobile gallery recomposition |
| PDP buybox | Non-sticky generic stack | 5/12 shared `sticky-buybox` presentation on desktop/tablet; normal flow on mobile |
| PDP variants | Insufficient visual treatment | Reusable chip-style variant selector |
| PDP detail content | No canonical tab surface | Reusable `commerce.content-tabs` Page Schema component; no raw JS/HTML injection |
| Related products | Generic | Beauty Lab recommendation presentation with responsive cards |
| Builder/theme parity | Preview had theme, Builder did not | Builder canvas and immutable preview inherit the same template design-token authority as Template Library preview |
| Demo imagery | Three primitive SVG blobs | Beauty Lab Page Schemas no longer reference those primitive assets; photographic demo URLs are replaceable bindings |

## Responsive contract

The same Page Schema documents render in all three Builder viewport modes.

- Desktop: 1200px Builder canvas; hero uses split editorial composition, Formula Finder split panel, 6-column product rhythm, PDP 7/12 + 5/12 sticky buybox.
- Tablet: 768px Builder canvas; shared presentations reduce guided/index/product columns and preserve PDP 7/12 + 5/12 where practical.
- Mobile: 390px Builder canvas; hero photo/copy recompose vertically, finder becomes stacked, product grids become two columns, PDP gallery and buybox both become 12/12 and the buybox leaves sticky mode.

## Preset authority

The pilot adds an explicit canonical preset materialization chain:

`Template preset -> Page preset -> Section preset -> Component preset`

`BEAUTY_LAB_PRESET_BUNDLE` is generated from `BEAUTY_LAB_TEMPLATE_PACKAGE`. Materializers deep-clone the canonical Page Schema; they do not generate a separate design document or second page authority. Acceptance tests cover the Home and PDP page presets plus the hero, Formula Finder, Ingredient Index, Texture Lab, product grid, routine, gallery, sticky buybox and product-tabs component presets.

## Visual Builder authority

Beauty Lab stays installable through the existing Template Library. Installation creates Page Schema drafts only. The Visual Builder renders the draft through the same `StorefrontRuntimeRenderer`, shared component registry and shared renderer registry used by Template Library live preview. Builder selection/editing still operates on Page Schema nodes and existing configurable/responsive contracts; the pilot does not add a Beauty Lab-only preview or renderer engine.

Production inspection route after installing/selecting the template:

`/admin/tartalom/builder?page=beauty-lab.home`

Template Library route:

`/admin/tartalom/builder?view=templates`

## Deliberate non-equivalences

Two reference details cannot be copied literally without a project-owned source asset/font and are therefore implemented by the closest safe runtime equivalent:

1. Exact reference photography is not copied. Replaceable photographic demo imagery preserves crop, focal dominance, whitespace and section geometry without treating the reference image as an asset.
2. Exact proprietary display typeface, if present in the reference, is not bundled. The Page Schema uses the merchant display/heading font token with a Georgia editorial fallback; a licensed merchant font can replace it without changing the template.

A before/after efficacy module is intentionally omitted from the pilot because no verified product evidence is attached to the demo content. This avoids presenting fabricated efficacy evidence while preserving the ability to add a future presentation-only evidence component under the shared schema/runtime contract.

## Acceptance commands / gates

The exact-head CI must cover:

- targeted Beauty Lab technical acceptance;
- Beauty Lab preset materialization acceptance;
- Beauty Lab visual-fidelity structural/responsive acceptance;
- full test/quality suite;
- TypeScript;
- production Next.js build;
- repository security checks.

Only after exact-head CI is completely green may this pilot PR merge to `main`. Production deployment must then be READY before product-owner visual acceptance in the production Visual Builder.
