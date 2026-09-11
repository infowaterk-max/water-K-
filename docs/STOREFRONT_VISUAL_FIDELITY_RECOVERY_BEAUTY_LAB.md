# Storefront Visual Fidelity Recovery — Beauty Lab canary

Status: **architecture proof / no Product Owner visual PASS yet**

Branch authority: `feature/visual-fidelity-recovery-beauty-lab`

## 1. Canonical visual authority

The Product Owner-approved Beauty Lab reference is the generated composite previously selected explicitly as the **second / real Beauty Lab choice**: `Minimalista BEAUTY LAB webáruház mockup.png`.

Visual identity anchors:

- brand: **BEAUTY LAB — SCIENCE MEETS BEAUTY**;
- hero headline: **YOUR SKIN. YOUR FORMULA.**;
- formula / ingredient / texture discovery language;
- desktop Home + mobile Home + desktop PDP are visible in the same approved reference;
- the reference is a visual specification, not a mood board.

The old screenshot in which `Beauty Demo` rendered Ritual House is negative evidence only and MUST NOT become a visual authority.

The approved reference is not committed as a storefront screenshot and MUST NOT be baked into the DOM as a screenshot. Runtime output must be reconstructed from editable, reusable Builder capabilities and replaceable media.

## 2. Read-only baseline

At recovery start:

- `main`: `2e35d37b8a0d06b514f40432d896dd991c4fb398`;
- production Vercel: READY on the same SHA;
- production `/api/health`: HTTP 200, database `ok`;
- Supabase production project `waterk-platform`: `ACTIVE_HEALTHY`;
- merged Visual Fidelity Pilot 01: PR #293;
- historical Beauty Lab re-acceptance contract: Wave 32;
- Support Knowledge baseline: Draft PR #156, heavily diverged from current main.

No production/Supabase mutation belongs to this recovery branch.

## 3. Reference → Builder decomposition matrix

| Reference area | Reference geometry / visual contract | Current primitive / presentation | 1:1 today? | Capability gap / required shared repair |
|---|---|---|---|---|
| Header | slim white horizontal shell, compact brand lockup, centered nav, utility icons | `system.header` + `system.navigation`, `editorial-lab` | No | Header typography, spacing and mobile behavior are renderer-special-cased; make shell geometry/style editable and breakpoint-aware. |
| Hero composition | photo-dominant asymmetric composition; title overlays left; portrait central; product/texture composition to right; no generic split-panel look | `visual.layered-canvas` + `visual.layer` | No | General breakpoint-aware layer frame/position/size needed; remove Beauty-specific renderer branches. |
| Hero headline | condensed editorial display, strong two-tone emphasis, exact line breaks and tight leading | `content.heading`, `display-editorial` | No | Editable font family, font size, weight, line-height, letter-spacing, text transform, max-width and responsive values. |
| Hero copy / CTA | compact text block and square black CTA under headline | `content.text` + `content.button` | Partial | Exact width, spacing, typography and frame values must be schema-driven rather than preset-hardcoded. |
| Hero product / texture imagery | independently positioned product render / watery texture / badge-like elements | `visual.layer`, `content.image` | Partial | General layer frame, aspect ratio, min/max dimensions, focal point/crop and breakpoint visibility/position. |
| USP row | three compact icon/label items aligned under hero copy | generic grid/text | Partial | Reusable inline icon+label / track sizing plus exact gap/alignment controls. |
| Formula Finder | left title, five equal choice tiles, action; adjacent personalized recommendation panel | `guided.finder`, `editorial-choice-grid` | Partial | Arbitrary grid tracks, card frame/spacing, selected state styling, responsive track definitions. |
| Ingredient Index | six media cards with different ingredient imagery and compact metadata | editorial/media index presentation | Partial | Exact card aspect ratio, card frame, typography, image crop/focal point and track sizing must be editable. |
| Texture Lab | four wide texture tiles, strong image dominance and compact text footer | media navigation presentation | Partial | Per-card aspect ratio, image/text region geometry and responsive layout need general controls. |
| Featured products | 5-up desktop cards, dense product/meta/CTA composition | `commerce.product-grid`, `beauty-lab` | Partial | Card image ratio/frame, internal spacing, badge/CTA placement, typography and responsive columns need schema-driven values. |
| Routine band | horizontal editorial routine strip with steps and image accents | split/editorial components | Partial | General asymmetric tracks, step-item layout and per-breakpoint arrangement. |
| PDP gallery | left media rail + large product image, desktop dominant gallery | structured product gallery, `editorial-thumbnails` | Partial | Exact gallery track ratio, thumbnail sizing, media aspect/focal/crop and breakpoint geometry. |
| PDP buybox | right compact purchase column, badge, title, rating, price, copy, chips, quantity/CTA | commerce/shared buybox + stack | Partial | Exact widths/spacing/typography/chip/button layout must be configurable; sticky behavior cannot encode visual geometry alone. |
| PDP tabs | horizontal tabs and ingredient/content table | content tabs | Partial | Exact border, spacing, typography and responsive behavior. |
| Related products | compact 3-up recommendation cards beside before/after area in reference | recommendation/product cards | Partial | Flexible asymmetric lower PDP grid and exact card geometry. |
| Spacing rhythm | very dense hero, then consistent narrow white editorial bands | section/container token spacing | No | Current fixed token scale is too coarse; add safe explicit spacing style values + breakpoint overrides. |
| Borders / surfaces | thin light borders, near-square cards, white/very pale surfaces | tone/radius tokens | Partial | Border width/style/color, radius and background must be general style properties. |
| Shadows | restrained / near-flat | mostly component defaults | No | Explicit shadow control, including `none`, must be shared. |
| Image crop / focal point | visual focus varies per hero/card/gallery | `objectPosition` exists on images | Partial | Builder currently does not provide full focal/crop/aspect controls and responsive override is missing. |
| Desktop / tablet / mobile | same visual language but composition reflows, hides/repositions layers and changes spacing/type | `responsive.hidden` + `gridSpan` | No | Responsive config currently supports only hidden/gridSpan. It needs safe per-breakpoint config overrides. |

## 4. Proven architecture gaps

### 4.1 Responsive model

Current `StorefrontResponsiveOverride` contains only `hidden` and `gridSpan`. This is the primary blocker for faithful desktop/tablet/mobile geometry.

Required shared extension: safe, manifest-validated **per-breakpoint config override** with inherited desktop → tablet → mobile resolution.

### 4.2 Layout model

Current `layout.grid` renders equal `1fr` tracks. The reference requires asymmetric tracks and explicit editorial ratios.

Required shared extension: validated custom grid tracks / rows while preserving numeric `columns` compatibility.

### 4.3 Style model

Current layout and typography values are mostly token presets or presentation-specific renderer branches.

Required shared extension: an allowlisted `style` object for visual properties required by reference fidelity, including dimensions, min/max sizes, spacing, alignment, background, border, radius, shadow, typography, aspect ratio and safe positioning. No raw arbitrary DOM/CSS injection.

### 4.4 Layer model

`visual.layer` has generic anchors, but Pilot 01 overrides those values with `editorial-photo`, `editorial-copy-panel`, `editorial-product-inset` and `editorial-badge` branches in the renderer.

Required repair: presentation names may remain reusable semantic presets, but exact geometry must come from canonical Page Schema / style config and responsive overrides, not Beauty-Lab-specific renderer branches.

### 4.5 Builder inspector

The current inspector exposes only manifest config plus breakpoint `hidden` and `gridSpan`.

Required repair: edit the new shared style/config objects at the selected breakpoint and expose the same authoritative Page Schema that Runtime renders.

### 4.6 Presets

The current preset system safely materializes canonical template/page/section/component nodes but does not provide independent reusable design/layout preset definitions.

Required repair: keep canonical preset authority but allow reusable shared layout/style preset fragments rather than template-local CSS or renderer branches.

## 5. Acceptance defect in Pilot 01

`tests/storefront-beauty-lab-visual-fidelity-pilot01.test.tsx` validates static HTML strings, presentation markers and a few inline style fragments. It is not a screenshot comparison.

More importantly, current `vitest.config.ts` includes only `tests/**/*.test.ts`, therefore `.test.tsx` files are not part of the normal Vitest suite.

The recovery must:

1. move/replace required executable gates so CI actually runs them;
2. add actual Runtime screenshot capture for desktop/tablet/mobile;
3. retain technical Page Schema/registry/round-trip tests;
4. keep visual acceptance as a separate Product Owner gate.

## 6. Architecture decision

**Do not rebuild the whole Visual Builder.** Preserve:

- one Page Schema;
- one Component Registry;
- one Storefront Runtime / renderer authority;
- Builder draft/history/publish authority;
- existing binding and commerce engines;
- canonical template/preset authority.

Refactor the shared responsive/layout/style capability layer.

## 7. Beauty Lab rebuild decision

Home and PDP visual schemas must be rebuilt against this decomposition after the shared capabilities exist. Preserve only reusable commerce/binding/finder semantics that survive the visual contract.

The current hidden Wave-32 compatibility nodes are not an acceptable long-term solution. Historical semantic compatibility must be proven without invisible DOM inserted only to satisfy old acceptance assertions.

## 8. Release gate

Required order:

`architecture proof → shared capability implementation → Beauty Lab rebuild → technical tests → actual Runtime D/T/M screenshots → side-by-side + overlay/diff → Product Owner visual PASS → only then merge/deploy`

Until Product Owner PASS:

- Draft PR only;
- no merge to `main`;
- no production deploy;
- no production Supabase mutation;
- no mass repair of the remaining templates.
