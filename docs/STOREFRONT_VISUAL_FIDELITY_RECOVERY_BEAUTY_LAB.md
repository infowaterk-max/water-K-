# Storefront Visual Fidelity Recovery — Beauty Lab canary

Status: **shared capability proof green; Beauty Lab canonical v2 + explicit Builder draft-upgrade path implemented; technical gates green; Product Owner visual PASS still required**

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

| Reference area | Reference geometry / visual contract | Pre-recovery primitive / presentation | Recovery state | Shared solution / remaining gap |
|---|---|---|---|---|
| Header | slim white horizontal shell, compact brand lockup, centered nav, utility icons | `system.header` + `system.navigation`, `editorial-lab` | Shared capability available | Header/inner/brand/tagline/utility/mobile-toggle style slots are Page Schema data; Builder inspector classification still needs polish. |
| Hero composition | photo-dominant asymmetric composition; title overlays left; portrait central; product/texture composition to right | `visual.layered-canvas` + hardcoded Beauty presentations | Shared capability available | Layer geometry is now allowlisted schema style with D/T/M inheritance; Beauty-specific presentation branches are no longer required by rebuilt canary schema. |
| Hero headline | condensed editorial display, two-tone emphasis, exact line breaks and tight leading | `content.heading`, `display-editorial` | Shared capability available | Font family/size/weight/stretch/leading/tracking/max-width/color are schema-driven. Exact final font face remains a visual-acceptance item. |
| Hero copy / CTA | compact text block and square black CTA | text/button presentation defaults | Shared capability available | Schema style controls exact frame and type while preserving normal content bindings. |
| Hero product / texture imagery | independently positioned product render / texture / badge | visual layer + inset presentation | Shared capability available | Layer and image geometry/crop are editable schema data. Exact approved-reference media remains replaceable content, not baked UI. |
| USP row | three compact icon/label items aligned under hero | generic grid/text | Implemented in canary schema | Shared grid + style controls 3-up desktop/mobile geometry. |
| Formula Finder | left title, five choice tiles, adjacent recommendation panel | `guided.finder` | Partial | Shared finder semantics remain; exact internal card micro-style still needs visual screenshot tuning. |
| Ingredient Index | six media cards | guided/media index | Partial | Semantic component retained; final card geometry remains screenshot-tuning work. |
| Texture Lab | four wide texture tiles | guided/media navigation | Partial | Semantic component retained; final card geometry remains screenshot-tuning work. |
| Featured products | 5-up dense product cards | `commerce.product-grid` | Partial | columns/imageRatio are configurable; finer internal card style is a later shared commerce-style capability if screenshot proves necessary. |
| Routine band | horizontal editorial routine strip | split feature | Partial | Existing shared presentation retained pending runtime comparison. |
| PDP gallery | thumbnail rail + dominant image | product gallery | Partial | 7/5 shared PDP structure retained; gallery aspect/thumbnail presentation already configurable. |
| PDP buybox | compact purchase column | shared commerce + stack | Partial | Stack frame and CTA geometry are schema-driven; internal commerce micro-style remains screenshot-tuning work. |
| PDP tabs | horizontal tabs and ingredient/content table | content tabs | Partial | Existing shared tabs retained pending runtime comparison. |
| Related products | compact recommendation cards | recommendation row | Partial | Existing shared recommendation semantics retained pending runtime comparison. |
| Spacing rhythm | dense hero, narrow white editorial bands | token spacing | Shared capability available | Explicit safe spacing values + breakpoint overrides are supported. |
| Borders / surfaces | thin borders, near-square cards, pale surfaces | tone/radius tokens | Shared capability available | border/radius/background/shadow are allowlisted schema style. |
| Image crop / focal point | per-placement focus/crop | objectPosition + renderer defaults | Shared capability available for primitive media | Page Schema controls image object-fit/object-position; specialized commerce media may need shared extension after screenshot evidence. |
| Desktop / tablet / mobile | composition reflows/repositions and changes type/spacing | only hidden/gridSpan | Shared capability available | Structural hidden/gridSpan stays canonical; visual geometry uses inherited `style.base → desktop → tablet → mobile` overrides. |

## 4. Shared capability proof

### 4.1 Responsive visual model

The recovery deliberately did **not** add an unrestricted arbitrary responsive-config override. Structural `responsive.hidden` / `gridSpan` remains intact.

Visual geometry now uses a safe Page Schema `style` model:

- `base`;
- `desktop`;
- `tablet` inheriting desktop;
- `mobile` inheriting tablet.

The style surface is allowlisted and rejects CSS URL/expression payloads and fixed positioning. This keeps the Page Schema editable without turning it into arbitrary CSS injection.

### 4.2 Layout / typography / layer model

Shared primitives expose style slots for section/container/grid/stack/heading/text/image/button/header/navigation and visual layered canvas/layer. Explicit schema style is applied after reusable presentation defaults, so a template can express its geometry without adding template-specific runtime branches.

The executable technical proof covers asymmetric grid tracks and responsive typography from the same Page Schema.

### 4.3 CI proof and discovered infrastructure incident

The first executable `.test.ts` Runtime render surfaced a previously hidden Vitest JSX-runtime defect (`React is not defined`). A one-file React import merely moved the failure to the next renderer and was rejected as a patchwork fix.

The verified shared fix is Vitest automatic React JSX transform. Exact head `1e21b95e8058f2b570b0174d46c59cd16697d708` passed:

- security audit;
- Quality tests;
- TypeScript check;
- production build;
- release-manifest generation.

This also proves why the old `.test.tsx` Pilot 01 check was not a valid release gate: repository Vitest includes `tests/**/*.test.ts`, not `.test.tsx`.

## 5. Beauty Lab rebuild decision

Home and PDP visual schemas are rebuilt from the approved-reference decomposition while preserving reusable commerce/binding/finder semantics.

The hidden Wave-32 compatibility aliases are removed. Historical semantic intent must be carried by visible canonical schema nodes and authoritative bindings, never invisible DOM inserted only to satisfy assertions.

The rebuilt canary uses only shared primitives plus schema style. Remaining specialized component micro-style gaps must be proven by actual Runtime screenshots before another shared capability is added.

### 5.1 Persisted Builder-v1 authority gap and canonical v2 recovery

A Product Owner screenshot from the real Visual Builder exposed a separate authority defect after the catalog/QA rebuild: the Builder still showed the old WATER-K / beige-cactus Beauty Lab composition even though the current source-controlled Beauty Lab package rendered the recovered reference-driven design.

Root cause: the Builder correctly loaded the tenant's already-persisted Beauty Lab **v1 draft Page Schema**. Updating the source-controlled template catalog did not and must not silently overwrite an existing merchant draft.

The recovery therefore promotes the reference-driven package to a real canonical **Beauty Lab v2** installable template identity and uses the existing shared template-installation contract to distinguish `upgrade` from `refresh`/`switch`.

Builder behavior is now explicit and safe:

- same Beauty Lab key + persisted v1 + catalog v2 => **Frissítés elérhető · v1 → v2**;
- the action is **Sablon frissítése**, never an automatic migration;
- a dedicated **SABLONFRISSÍTÉS** confirmation explains that current draft pages can be replaced;
- products, pricing, inventory, orders and customer data remain outside the template mutation boundary;
- the published storefront remains unchanged until a later explicit publish action;
- no production Supabase mutation is performed by this recovery process before Product Owner visual acceptance.

The canonical wrapper does not introduce another renderer. It advances template identity only; all pages still use the same Page Schema, Component Registry, Storefront Runtime and Visual Builder authority.

## 6. Visual acceptance gate and screenshot evidence

Technical green is necessary but not sufficient.

The screenshot gate now captures both reference-proportioned browser viewports and full Runtime roots, rather than comparing a 6000–9000 px full-page render directly against a reference crop.

Exact visual head `9c6077a6b6149467c0466cb47ddc8cc72a4313a6` successfully produced real Runtime Home/PDP screenshots for Desktop, Tablet and Mobile. The recovered content includes the Beauty Lab brand, reference-driven hero direction, three-up trust strip, corrected upper-page flow, six-item ingredient index and denser featured-product grid. This is evidence of the correct runtime/schema path, **not Product Owner visual PASS**.

The current Builder-version recovery head before this documentation trigger is `36691dde8f75b8d122daeded01d53e5420e78349`. On that exact head:

- Quality tests: PASS;
- TypeScript: PASS;
- production build: PASS;
- security audit: PASS;
- release manifest: PASS;
- Vercel branch preview: READY;
- production deployment: untouched.

Required release evidence remains:

1. actual Runtime Desktop screenshot on final exact head;
2. actual Runtime Tablet screenshot on final exact head;
3. actual Runtime Mobile screenshot on final exact head;
4. side-by-side approved-reference comparison;
5. overlay/diff assistance;
6. Product Owner visual PASS.

The approved reference remains the decision authority. Automated screenshot differences cannot overrule the Product Owner.

## 7. Support Knowledge backfill

PR #156 remains historical input, not a safe current branch. The recovery will create a current-main successor after verified recovery facts stabilize. It must preserve the old knowledge and add:

- technically green but visually unacceptable Beauty Lab incident;
- missing pre-implementation Reference → Builder capability proof;
- CI-green incorrectly treated as visual release-readiness;
- `.test.tsx` fidelity gate excluded by Vitest include;
- first real Runtime test exposing JSX transform failure;
- rejected one-file React-import workaround;
- verified Vitest automatic JSX runtime fix;
- persisted Builder-v1 schema remaining visually stale while catalog/QA had recovered;
- versioned canonical template upgrade with explicit merchant confirmation as the fix;
- Product Owner visual gate as prevention.

## 8. Release gate

`architecture proof → shared capability implementation → Beauty Lab rebuild → canonical template versioning → technical tests → actual Runtime D/T/M screenshots → side-by-side + overlay/diff → Product Owner visual PASS → only then merge/deploy`

Until Product Owner PASS:

- Draft PR only;
- no merge to `main`;
- no production deploy;
- no production Supabase mutation;
- no mass repair of the remaining templates.
