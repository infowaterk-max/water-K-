# Special Commerce Wave 7 — Template 2.0 visual / UX / quality review

## Scope and evidence level

This document is the missing visual/UX/template-quality acceptance layer for Special Commerce Wave 7. It reviews only the concrete source-controlled Template 2.0 portfolio and does not create a new roadmap wave, commerce engine, Page Schema, checkout path or template-local authority.

Repository truth at review start:

- Wave 7 base candidate: `142933eab74e909f285f101ee527b6d665fe3f80`;
- concrete Template 2.0 packages: **24**;
- launch target: **42**;
- missing packages: **18**;
- formal 42-template closure: **BLOCKED**;
- production remained on `main` and was not mutated by this review;
- staging Special Commerce recipe/release definition tables were read-only checked and were empty at review time.

The source/runtime review is complete for all 24 packages. The authenticated preview route exists and supports Desktop / Tablet / Mobile, but the exact-head Vercel preview is protected by Vercel SSO and the application also requires an authenticated `store.manage` store context. The available read-only verification channel cannot establish that browser session. Therefore **live browser visual acceptance is `NOT VERIFIED`**, not PASS. No template is labelled `LAUNCH READY` in this report solely from source inspection.

## Common portfolio contract

All 24 reviewed packages use the canonical 14 Page Schema page types:

`home`, `catalog`, `product`, `search`, `cart`, `checkout`, `account`, `content`, `blog-index`, `blog-article`, `faq`, `contact`, `legal`, `not-found`.

All declare the shared Desktop / Tablet / Mobile responsive contract and resolve through the common Visual Builder component and renderer registries. The accompanying quality test makes those facts executable acceptance gates.

Special Commerce marker legend below: `R` = required, `S` = supported, `O` = optional, omitted = not applicable. Capability abbreviations: Scene, Room, Recipe, Release, Finder, Composer, Configurator, Compatibility.

## Repository inventory — 24 real templates

| Template key | Name | Category | Ver. | Page types | Primary design direction | Current commerce use case | Special Commerce fit | Builder / preset relation | Responsive |
|---|---|---:|---:|---|---|---|---|---|---|
| `outdoor.alpine-lodge` | Alpine Lodge | outdoor | 1 | canonical 14 | warm natural alpine editorial luxury | collection → season/material → product → story | Scene S; Release O; Finder S; Composer S; Config O; Compat O | authored Page Schema, layered editable hero, shared registry | D/T/M |
| `beauty.beauty-lab` | Beauty Lab | beauty | 2 | canonical 14 | clinical + sensory science-beauty system | concern/formula discovery and guided selection | Scene S; Release O; Finder R; Composer O; Config O | canonical v2 wrapper over shared runtime; viewport style slots / authored presets | D/T/M |
| `creator.creator-station` | Creator Station | creator | 1 | canonical 14 | dark digital creator workflow | equipment chain, setup workflow, creator bundles | Scene O; Release R; Composer S | authored workflow Page Schema, shared registry | D/T/M |
| `beauty.derma-studio` | Derma Studio | beauty | 1 | canonical 14 | clean clinical concern → routine | concern-led skincare routine discovery | Scene O; Release O; Finder R; Composer O; Config O | authored concern/routine Page Schema, shared registry | D/T/M |
| `fashion.editorial-atelier` | Editorial Atelier | fashion | 1 | canonical 14 | asymmetric fashion magazine | editorial campaign → look/product merchandising | Scene R; Release O; Finder O; Composer S | authored asymmetric sections, shared registry | D/T/M |
| `home.gallery-edit` | Gallery Edit | home | 1 | canonical 14 | contemporary interior gallery / object-as-art | room discovery, shop-the-room, curated composition | Scene R; Room R; Finder O; Composer R; Config S; Compat O | authored gallery Page Schema, shared registry | D/T/M |
| `jewelry.heritage-atelier` | Heritage Atelier | jewelry | 1 | canonical 14 | heritage craft and provenance luxury | maker/material/collection storytelling | Scene S; Release O; Finder O; Composer S; Config S; Compat O | authored craft/story presets, shared registry | D/T/M |
| `gaming.loot-vault` | Loot Vault | gaming | 1 | canonical 14 | theatrical collector vault | collector discovery and genuine release state | Scene O; Release R; Finder S; Composer S; Config O; Compat O | authored vault Page Schema, shared registry | D/T/M |
| `food.market-pantry` | Market Pantry | food | 1 | canonical 14 | modern premium grocery / organized pantry | pantry discovery, Build a Box, recipe merchandising | Scene O; Recipe R; Release O; Finder O; Composer S | `organized-premium-market` + shared registry; Recipe uses shared component | D/T/M |
| `jewelry.modern-luxe` | Modern Luxe | jewelry | 1 | canonical 14 | airy contemporary premium luxury | collection, gifting, signature product discovery | Scene S; Release O; Finder O; Composer S; Config S; Compat O | authored editorial presets, shared registry | D/T/M |
| `fashion.monarche` | Monarche | fashion | 1 | canonical 14 | balanced modern premium fashion retail | edit → arrivals → product → story | Scene R; Release S; Finder O; Composer S | authored fashion Page Schema, shared registry | D/T/M |
| `pet.my-pack` | My Pack | pet | 1 | canonical 14 | pet/household contextual replenishment | profile-led need and replenishment discovery | Release O; Finder R; Composer S; Config O; Compat O | contextual Page Schema, shared registry | D/T/M |
| `sport.performance-lab` | Performance Lab | sport | 1 | canonical 14 | dark data-led specialist performance lab | goal → metrics → gear finder / compare | Scene O; Release O; Finder R; Composer S; Config O; Compat O | technical Page Schema, shared registry | D/T/M |
| `gaming.playroom` | Playroom | gaming | 1 | canonical 14 | playful social console discovery | platform/genre/social game discovery | Scene O; Release S; Finder S; Composer S; Config O; Compat O | discovery Page Schema, shared registry | D/T/M |
| `gaming.rig-forge` | Rig Forge | gaming | 1 | canonical 14 | dark technical PC build configurator | component build, compatibility and setup | Scene O; Release S; Finder R; Composer R; Config R; Compat R | configurator Page Schema, shared registry | D/T/M |
| `beauty.ritual-house` | Ritual House | beauty | 1 | canonical 14 | warm dark sensory ritual / cocooning | mood/ritual discovery and curated sets | Scene S; Release O; Finder R; Composer S; Config O | atmospheric Page Schema, shared registry | D/T/M |
| `tech.spec-lab` | Spec Lab | tech | 1 | canonical 14 | dark specialist specification lab | spec comparison, finder, configurator, evidence | Scene O; Release S; Finder R; Composer S; Config R; Compat R | technical Page Schema, stable Builder IDs/bindings | D/T/M |
| `sport.sport-hub` | Sport Hub | sport | 1 | canonical 14 | clean energetic mainstream multisport | sport/skill navigation and broad retail | Scene O; Release O; Finder R; Composer S; Config O; Compat O | mainstream sport Page Schema, shared registry | D/T/M |
| `fashion.statement-lab` | Statement Lab | fashion | 1 | canonical 14 | contemporary object/material design lab | statement-piece/material-led discovery | Scene R; Release S; Finder O; Composer S | asymmetric gallery Page Schema, shared registry | D/T/M |
| `fashion.street-drop` | Street Drop | fashion | 1 | canonical 14 | high-energy urban drop commerce | drop discovery, genuine release/stock state | Scene S; Release R; Finder O; Composer S | urban drop Page Schema, shared registry | D/T/M |
| `food.table-gift` | Table Gift | food | 1 | canonical 14 | premium occasion gifting / table curation | guided gift composition and corporate gifting | Scene O; Recipe S; Release O; Finder O; Composer R | premium gifting Page Schema, shared registry | D/T/M |
| `tech.tech-deck` | Tech Deck | tech | 1 | canonical 14 | clean consumer-electronics decision commerce | category/use-case/compare/configure | Scene O; Release S; Finder R; Composer S; Config R; Compat R | clean tech Page Schema, shared registry | D/T/M |
| `industrial.tool-depot` | Tool Depot | industrial | 1 | canonical 14 | professional B2B specification-first supply | SKU/category/bulk/reorder/technical support | Scene O; Release O; Finder R; Composer R; Config R; Compat R | professional supply Page Schema, shared registry | D/T/M |
| `outdoor.trail-expedition` | Trail Expedition | outdoor | 1 | canonical 14 | cinematic route-first expedition retail | route → checklist/kit → essentials | Scene S; Release O; Finder R; Composer S; Config O; Compat O | route/adventure Page Schema, shared registry | D/T/M |

## Template-by-template scorecard

Scores are source/runtime/design-system review scores, not screenshot scores. Mobile and visual scores are intentionally capped conservatively because authenticated live-browser visual acceptance is `NOT VERIFIED`.

| Template | Design | Category fit | Commerce UX | Mobile | Builder | Special Commerce | Accessibility | Uniqueness | Final status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Alpine Lodge | 9 | 9 | 8 | 8 | 9 | 8 | 8 | 9 | MINOR HARDENING |
| Beauty Lab | 9 | 9 | 8 | 9 | 10 | 9 | 9 | 9 | MINOR HARDENING |
| Creator Station | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | MINOR HARDENING |
| Derma Studio | 9 | 10 | 8 | 8 | 9 | 9 | 8 | 9 | MINOR HARDENING |
| Editorial Atelier | 10 | 10 | 8 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Gallery Edit | 9 | 10 | 8 | 8 | 9 | 9 | 8 | 9 | MINOR HARDENING |
| Heritage Atelier | 9 | 10 | 8 | 8 | 9 | 8 | 8 | 9 | MINOR HARDENING |
| Loot Vault | 9 | 10 | 8 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Market Pantry | 9 | 10 | 9 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Modern Luxe | 9 | 9 | 8 | 8 | 9 | 8 | 8 | 8 | MINOR HARDENING |
| Monarche | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 8 | MINOR HARDENING |
| My Pack | 9 | 10 | 8 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Performance Lab | 9 | 10 | 9 | 8 | 9 | 9 | 8 | 9 | MINOR HARDENING |
| Playroom | 9 | 10 | 8 | 8 | 9 | 8 | 8 | 9 | MINOR HARDENING |
| Rig Forge | 9 | 10 | 9 | 8 | 9 | 10 | 8 | 10 | MINOR HARDENING |
| Ritual House | 10 | 10 | 8 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Spec Lab | 9 | 10 | 9 | 8 | 9 | 10 | 8 | 9 | MINOR HARDENING |
| Sport Hub | 8 | 9 | 9 | 8 | 9 | 9 | 8 | 8 | MINOR HARDENING |
| Statement Lab | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | MINOR HARDENING |
| Street Drop | 10 | 10 | 9 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Table Gift | 9 | 10 | 9 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |
| Tech Deck | 9 | 10 | 9 | 8 | 9 | 10 | 8 | 9 | MINOR HARDENING |
| Tool Depot | 9 | 10 | 9 | 8 | 9 | 10 | 8 | 10 | MINOR HARDENING |
| Trail Expedition | 10 | 10 | 8 | 8 | 9 | 9 | 8 | 10 | MINOR HARDENING |

Final-status interpretation: no source-reviewed template currently warrants a major redesign recommendation, but no template is promoted to `LAUNCH READY` until authenticated Desktop + Mobile visual acceptance can be performed. This is an evidence limitation, not a fabricated PASS.

## Design identity and similarity review

No pair is marked `TOO SIMILAR` from repository design DNA, typography/section hierarchy and authored home composition. The closest category families are still materially differentiated:

- Fashion: Editorial Atelier = asymmetric magazine; Monarche = balanced premium retail; Street Drop = urban drop; Statement Lab = object/material laboratory.
- Beauty: Beauty Lab = clinical/sensory formula system; Derma Studio = concern/routine clinical journey; Ritual House = dark sensory ritual.
- Gaming: Playroom = social/discovery; Loot Vault = collector theatre; Rig Forge = technical PC build.
- Tech: Tech Deck = bright consumer decision commerce; Spec Lab = dark specialist specification/evidence lab; Rig Forge remains a gaming-PC configurator rather than a reskin.
- Sport/outdoor: Sport Hub = mainstream multisport; Performance Lab = data-led specialist sport; Trail Expedition = route-first expedition; Alpine Lodge = quiet natural alpine lifestyle.
- Jewelry/design: Heritage Atelier = provenance/craft; Modern Luxe = airy contemporary retail; Statement Lab = material/object study.
- Food: Market Pantry = grocery/pantry/build-a-box; Table Gift = occasion gifting/table curation.

A future screenshot pass can still discover visual convergence that source identity does not expose. If that happens, the affected pair must be marked `TOO SIMILAR`; a color-only reskin is not an acceptable fix.

## Commerce UX review

All templates remain presentation/layout authority only. Product pricing, inventory, cart, checkout and order authority remain shared. No template-local pricing/cart/checkout engine was found or introduced.

Source review covered product/listing structure, product gallery/buy-box layout, price/stock binding, CTA hierarchy, quantity/purchase controls through shared renderers, recommendations and cart/checkout transition. Specialist experiences continue to route into shared catalog/cart/checkout authority.

## Special Commerce integration review

### Interactive Scene / Shop the Look / Shop the Room

The shared Scene renderer uses bounded structured hotspot/product projections, safe hrefs, responsive hotspot coordinates and semantic hotspot anchors. The quality review found one shared P1 mobile-density issue: every hotspot previously rendered its full label/price/stock card simultaneously over the image. Dense scenes could overlap on mobile.

Implemented shared fix: mobile renders compact numbered hotspot markers while preserving the descriptive `aria-label`; the normal summary/room experience remains the readable product list below the scene. Desktop/tablet retain inline hotspot details. No template-local workaround and no mobile commerce engine were added.

### Recipe

The Recipe renderer uses the shared structured recipe/catalog authority, explicit servings control, mapped ingredient choices, structured claim display, readiness state and shared cart intent. The Market Pantry template still contained historical copy saying Recipe-to-Cart was not introduced. That contradicted current Wave 7 adoption policy.

Implemented template-local fix: Market Pantry copy now states that Recipe Commerce is available through the shared Builder registry and that structured mapping/evidence remains authoritative. No Market Pantry-specific Recipe renderer was added.

### Release

The shared Release renderer exposes scheduled/live/ended states, server-derived state authority, semantic time elements, countdown presentation, stock labels and auto-fit live item cards. The client countdown is presentation only and cannot unlock commerce.

### Finder

Finder uses shared guided components with explicit progress/question/options/results/explanation composition. Editorial choice-grid mode has viewport-specific column counts; the standard option layout wraps. No raw JSON authoring path is required.

### Composer / Room / Outfit / Bundle

Composer uses shared slot/item/summary/order-group renderers, structured subtotal/revalidation copy and shared cart/checkout authority. Required/optional/readiness text is not delegated to a template-local engine.

### Configurator / Compatibility

The review found one shared P1 responsive problem: `configurator.slot-list` used a fixed three-column row on every viewport, so long selected labels or stock text could compress/overflow on mobile.

Implemented shared fix: mobile slot rows stack to one column; desktop/tablet keep the three-column information layout; long labels use safe wrapping. Summary rows also wrap. Compatibility `unknown` remains explicit text and is never treated as compatible.

## Builder compatibility

Repository acceptance proves that every component used by every concrete package resolves from the shared Builder registry. The Special Commerce capability matrix resolves to the same shared Builder and renderer registries. Managed selectors remain outside generic free-form JSON configuration.

The review found no critical design element requiring a new template-local renderer. Existing authored Page Schema/preset composition remains installable and Builder-reproducible under the common authority model. Hero/media/typography/layout remain editable through the existing component/config/token system; Special Commerce components remain insertable shared capabilities.

## Responsive review

Source review covered the common D/T/M inheritance, hero/image composition, grid min/max behavior, product buy-box stacking, wrapped CTA/navigation/card structures, Scene hotspots, Finder grids/options, Composer grids and Configurator rows.

Implemented shared responsive fixes:

1. Scene mobile hotspot detail collision prevention.
2. Configurator mobile slot stacking and long-label wrapping.
3. Configurator summary wrapping.

No separate mobile commerce engine was introduced.

Live visual checks for crop, actual text wrapping, sticky interactions, popovers/dialogs and real viewport geometry remain `NOT VERIFIED` because authenticated browser access was unavailable.

## Accessibility review

Source-level checks confirm:

- Scene hotspots are semantic anchors with descriptive accessible labels; compact mobile markers keep the label in the accessibility tree.
- Recipe servings use a labelled numeric input; ingredient alternatives use labelled selects; violations/notices use status semantics; unavailable CTA is a real disabled button.
- Release dates/countdown use semantic `<time>` elements and textual state labels.
- Configurator compatibility uses explicit Compatible / Incompatible / Unknown text rather than color-only state.
- shared purchase controls retain labelled quantity controls and live/status messaging through the existing commerce runtime.

Browser-only checks — visible focus rendering under every template token set, final contrast, focus order with real content, and actual screen-reader dialog/popover behavior — remain `NOT VERIFIED` and must not be called PASS.

## Performance / hydration sanity

No per-template Special Commerce runtime bundle, pricing cache, inventory cache or checkout authority was introduced. Scene, Recipe, Release, Finder, Composer and Configurator remain shared renderers. Release client time is display-only and server release state remains commerce authority. No quality fix introduced a client-only template branch or a second mobile engine.

Hydration and layout-shift behavior in an authenticated exact-head browser remains `NOT VERIFIED`; exact-head CI remains the executable source/build gate.

## Issue classification and change tree

| ID | Priority | Type | Finding | Resolution |
|---|---|---|---|---|
| W7-Q-01 | P1 | shared engine | Scene full hotspot cards can collide on dense mobile scenes | shared renderer: compact mobile marker + accessible label; summary retained |
| W7-Q-02 | P1 | shared engine | Configurator slot-list fixed 3-column layout can break with long labels on mobile | shared renderer: mobile stack + `overflowWrap` + summary wrap |
| W7-Q-03 | P1 | template-specific | Market Pantry historical copy says Recipe-to-Cart is not introduced | copy corrected to shared Recipe Commerce / structured authority truth |
| W7-Q-04 | evidence blocker | environment | authenticated exact-head browser screenshots unavailable | `NOT VERIFIED`; no PASS/LAUNCH READY claim |
| W7-Q-05 | formal portfolio blocker | portfolio | only 24/42 concrete packages exist | keep formal 42 closure BLOCKED; do not fabricate 18 templates |

No P0 entitlement leak, commerce-authority leak, production mutation or template-local checkout path was found in this review.

## Representative depth acceptance

| Representative path | Source/runtime review | Desktop visual | Mobile visual |
|---|---|---|---|
| Fashion — Shop the Look (Editorial Atelier / Monarche / Statement Lab) | reviewed; shared Scene integration | NOT VERIFIED | NOT VERIFIED |
| Home — Shop the Room (Gallery Edit) | reviewed; shared Scene + Composer/Room contract | NOT VERIFIED | NOT VERIFIED |
| Food — Recipe (Market Pantry) | reviewed; stale copy fixed; shared Recipe renderer | NOT VERIFIED | NOT VERIFIED |
| Streetwear/Gaming — Release (Street Drop / Loot Vault) | reviewed; shared Release state authority | NOT VERIFIED | NOT VERIFIED |
| Beauty — Finder (Beauty Lab / Derma Studio / Ritual House) | reviewed; responsive Finder source contract | NOT VERIFIED | NOT VERIFIED |
| Tech — Configurator (Spec Lab / Tech Deck / Rig Forge) | reviewed; slot mobile hardening applied | NOT VERIFIED | NOT VERIFIED |
| Outdoor — Composer / gear setup (Trail Expedition / Alpine Lodge) | reviewed; shared Composer contract | NOT VERIFIED | NOT VERIFIED |

## Final review classification before exact-head CI

- Source-reviewed templates: **24 / 24**.
- `LAUNCH READY`: **0** — deliberately withheld until authenticated D/M visual evidence exists.
- `MINOR HARDENING`: **24** — source/design/runtime quality is strong; browser visual evidence remains outstanding.
- `SHARED ENGINE FIX REQUIRED`: **0 after this candidate**, with W7-Q-01 and W7-Q-02 implemented in shared renderers.
- `TEMPLATE-SPECIFIC DESIGN FIX REQUIRED`: **0 after this candidate**, with W7-Q-03 corrected.
- `MAJOR REDESIGN RECOMMENDED`: **0** from current evidence.
- `TOO SIMILAR`: **0** from current source/IA identity review.
- Formal 42-template closure: **BLOCKED (24/42, 18 missing)**.

The next acceptance action is not another redesign wave. It is exact-head CI/build verification plus authenticated Desktop/Mobile visual evidence when that environment is available. Production remains out of scope for Wave 7 quality hardening.
