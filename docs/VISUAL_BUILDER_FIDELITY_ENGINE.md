# Visual Builder Fidelity Engine

Status: **foundation phase started; stacked above Beauty Lab recovery; Draft only**

Branch: `feature/visual-builder-fidelity-engine`
Base: `feature/visual-fidelity-recovery-beauty-lab`

## Objective

Raise Shoperation Visual Builder from a safe block editor into a high-fidelity storefront composition system without sacrificing editability, responsive safety, commerce authority, accessibility, or template portability.

The target is not a Beauty-Lab-only patch. The target is a reusable Builder capability layer strong enough for all current and future storefront templates and later reusable by the standalone Website Builder.

## Product principle

A high-quality template must be both:

1. visually faithful to its approved reference; and
2. safely editable after installation.

If a result can only stay attractive while nobody edits it, it is not an acceptable Builder implementation.

## Editing model

The Builder will use three explicit levels.

### Normal

Merchant-safe controls:
- text and media;
- theme tokens;
- safe spacing;
- section visibility;
- curated layout/style presets;
- preset reset;
- content/data binding-safe edits.

Normal mode should make it difficult to accidentally destroy the template's visual DNA.

### Advanced

Composition controls:
- responsive grid;
- responsive section/component ordering;
- component style slots;
- responsive typography;
- image art direction and focal point;
- section composition presets;
- controlled overlap/layer layouts;
- per-breakpoint overrides.

### Expert

Agency/power-user controls:
- allowlisted section geometry;
- layer geometry;
- raw allowlisted style surface;
- responsive composition overrides;
- deliberate design-guard override.

Expert does not mean arbitrary HTML/CSS/JS injection. Storefront security and schema authority remain intact.

## Capability programme

### 1. Responsive composition engine

- independent Desktop / Tablet / Mobile section order;
- responsive child ordering;
- 12-column grid plus custom template tracks;
- span/start/end/order/alignment controls;
- gap and row/column rhythm controls;
- container/full/narrow/edge layouts;
- min/max width and height constraints;
- breakpoint inheritance with visible override state.

### 2. Section-bound layered canvas

- anchors and offsets;
- layer order;
- bounded overlap;
- safe absolute positioning inside a section only;
- image/text/product/decorative layers;
- responsive layer presets;
- no fixed-position storefront escape.

### 3. Component style slots

Shared components expose named internal visual surfaces instead of one monolithic style object.

Examples:
- product card: root, media, badge, title, subtitle, price, compare-price, CTA;
- finder: root, question, option, active-option, aside, CTA;
- PDP buybox: title, rating, price, description, options, purchase, trust;
- header: root, brand, tagline, nav, utility, mobile-toggle.

The slot contract is shared across templates. Template-specific runtime branching is forbidden.

### 4. Typography system

- actual font-family selection;
- display/body/interface roles;
- weight;
- responsive size;
- line height;
- tracking;
- transform;
- max text width;
- controlled authored line breaks;
- accent text styling;
- typography presets and reset.

### 5. Image art direction

- independent Desktop / Tablet / Mobile source when needed;
- inherited source by default;
- focal point / object position per viewport;
- cover/contain;
- responsive aspect ratio;
- replacement-safe media contract;
- later: crop UI and focal-point picker.

### 6. Preset engine and Design Guard

A preset must describe composition, not merely colors.

Preset scope can include:
- section ordering;
- grid and spacing;
- internal style slots;
- typography;
- image ratios/crops;
- responsive behavior;
- layer geometry.

Design Guard modes:
- off;
- warn;
- enforce.

The system reports visual drift separately from normal merchant content edits. A user can reset a component/section/page to its template preset without replacing product, customer, price, stock, order, or merchant copy authority.

### 7. State and interaction design

Planned shared controls:
- hover/focus/active/disabled states;
- transition presets;
- reveal/entrance animation with reduced-motion compliance;
- sticky/scrolled header states;
- accordion/tabs/carousel state styling;
- loading/empty/error/sold-out states.

No arbitrary script injection.

### 8. Reusable composition system

Planned:
- reusable sections/symbols;
- global header/footer authority;
- detach/override semantics;
- component variants;
- merchant saved blocks;
- template-owned presets;
- tenant-owned presets.

### 9. Design-token system

Extend current tokens with:
- fluid type scale;
- container widths;
- spacing scale;
- border system;
- shadows;
- motion tokens;
- z-index/layer tokens;
- media ratios;
- component-local token overrides.

### 10. Professional workflow

Planned:
- responsive override indicators;
- reset-to-inherited;
- copy/paste styles;
- copy/paste sections;
- multi-select where safe;
- keyboard movement;
- zoom and canvas rulers/guides;
- device presets;
- visual diff before publish;
- revision labels;
- draft/published compare;
- preset drift report.

### 11. Accessibility and quality gates

- heading hierarchy checks;
- alt-text requirements;
- color contrast warnings;
- focus visibility;
- tap-target warnings;
- overflow detection;
- responsive clipping detection;
- reduced-motion support;
- image dimension/performance warnings;
- Lighthouse-style builder diagnostics later.

### 12. AI-assisted composition later

AI may propose composition and style changes, but must emit normal Builder schema operations. It must not create a parallel renderer or hidden hardcoded page.

## Foundation implemented in phase 1

`storefront-fidelity-engine.ts` establishes shared contracts for:

- Normal / Advanced / Expert edit modes;
- responsive section ordering with breakpoint inheritance;
- component style-slot sanitization and resolution;
- responsive image art direction;
- visual-only preset application that preserves merchant content;
- template preset metadata;
- design-drift reporting;
- Design Guard warn/enforce decisions.

The phase-1 module is intentionally pure and runtime-independent enough to test before wiring it into persistence and UI.

## Next implementation sequence

1. integrate responsive section and child order into Storefront Runtime;
2. expose Advanced/Expert edit mode in Builder UI;
3. wire image art direction into `content.image` and specialized commerce media;
4. wire shared style slots into product cards, Finder, PDP, Header and editorial components;
5. add preset/reset operations and Design Guard UI;
6. add section-bound canvas controls;
7. recompose Beauty Lab exclusively through these shared capabilities;
8. repeat Desktop/Tablet/Mobile visual acceptance;
9. freeze capability contract only after Beauty Lab visual PASS;
10. propagate to remaining templates.

## Non-negotiable guardrails

- no merge to `main` during this development stream;
- no production deploy or production Supabase mutation;
- no screenshot-baked pages;
- no Beauty-Lab-specific runtime branch;
- no hidden DOM acceptance hacks;
- no arbitrary HTML/CSS/JS injection;
- visual template operations must not mutate products, prices, inventory, customers, orders, or payment authority;
- one canonical Page Schema / Component Registry / Runtime / Builder authority.
