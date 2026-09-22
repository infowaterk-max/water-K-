# Playroom Template Fidelity Playbook

Status: canonical working guidance for Shoperation storefront template work after the Playroom desktop acceptance.

## Why this document exists

The Playroom storefront reached an acceptable visual and Builder-usable state only after repeated corrections across visual fidelity, runtime authority, template versioning, asset strategy, and Builder editability. The purpose of this playbook is to prevent the same failure pattern on the remaining Playroom pages and on later templates.

This is not a reference-image recreation recipe. It is a production implementation discipline for Shoperation templates.

## The core lesson

A visually strong Shoperation template is not created by drawing more custom artwork. It is created by combining:

1. a strong, deliberate page composition;
2. high-quality visual content in reusable media slots;
3. a coherent design language carried across every page type;
4. merchant-editable Page Schema nodes;
5. shared runtime/component contracts instead of template-specific engines;
6. real commerce authority for product, price, stock, review, compatibility and order data;
7. screenshot-based acceptance against the intended visual direction;
8. an explicit template-version upgrade path whenever the canonical package changes materially.

## What went wrong before the accepted Playroom home

### 1. Structure was treated as enough

The early Playroom implementation had the correct broad blocks but looked generic and under-designed. A correct grid is only the skeleton. The merchant sees photography, crop, density, hierarchy, typography, spacing, contrast and rhythm.

Rule: do not declare visual completion because every requested section exists.

### 2. Asset-level overengineering replaced actual visual quality

Too much effort went into bespoke SVG artwork and one-off visual mechanisms. This made the implementation slower, harder to replace in Builder and still less convincing than a strong image-first composition.

Rule: prefer normal merchant-editable `content.image` media slots with focal point / art direction over bespoke illustration systems unless a reusable capability genuinely needs to exist.

### 3. Reference fidelity was interpreted too literally in some places and too loosely in others

Copying tiny reference details creates brittle code, but ignoring composition, visual weight and image dominance produces a page that only technically resembles the target.

Rule: reproduce the reference's visual hierarchy, density, rhythm, media prominence, section balance and interaction cues — not the screenshot pixels.

### 4. The storefront must never become a screenshot

Every merchant-meaningful part must remain independently editable: image, heading, body, CTA, link, badge, alignment, spacing and appropriate visual configuration. Business-authoritative values remain data-bound.

Rule: visual fidelity is subordinate to Page Schema / Builder editability, but editability is not an excuse for weak design.

### 5. Internal fidelity version and installable template version were confused

Playroom reached an internal v18 fidelity implementation while the installable package still identified as `gaming.playroom@2`. Existing v2 storefronts therefore looked current and received no upgrade offer.

Rule: when the canonical installable template materially changes, bump the actual `manifest.templateVersion`, stamp every page document with the same version, keep required historical versions exactly resolvable, expose only the canonical latest package in Template Library, and test the upgrade path.

### 6. Visual acceptance must inspect the rendered runtime

Code review alone did not catch the important visual differences. Exact-head screenshots were required.

Rule: every substantial visual template change needs runtime screenshot QA at the intended viewport. Compare the rendered page, not only source code.

## Canonical Playroom visual language

### Mood

Dark premium gaming environment, navy/ink base, cyan/electric-blue accents, controlled magenta/pink secondary accents, strong but not noisy glow. The page should feel energetic and social rather than like a technical dashboard.

### Layout

Use clear 12-column composition with asymmetry where useful. Strong large media blocks should be balanced by compact selector, discovery or utility blocks. Do not make every section the same full-width card stack.

### Media

Media is a primary design material. Use large purposeful crops, not decorative thumbnails. `object-fit: cover` for scene photography, `contain` for icons/product silhouettes where appropriate. Provide responsive art direction or focal positioning when the crop matters.

### Typography

Headings are bold, compact and confident. Large hero headings may use tight line-height and strong weight. Supporting copy stays concise and visually secondary. Avoid excessive all-caps outside intentional gaming/editorial labels.

### Surfaces

Cards use deep navy gradients, subtle cyan borders, controlled shadows and occasional glow. Avoid stacking borders, glows and gradients on every element; hierarchy requires quiet surfaces too.

### Calls to action

Primary CTA should be obvious and high contrast. Secondary actions are quieter. Do not create many equal-weight CTA buttons in one viewport.

### Icons

Use recognizable editable image/icon sources where recognition matters. Platform selector tiles should use large centered platform icons with safe inset, separate editable labels and shared renderer support. Do not hardcode brand-specific renderer logic.

### Density

Desktop Playroom should feel rich but not cramped. The accepted home became stronger when secondary cards were made denser while hero/media blocks retained scale.

## Builder contract

Merchant-editable presentation values should remain separate Page Schema properties/nodes. At minimum, where applicable:

- image source, alt text, focal point / object position and responsive art direction;
- heading and supporting copy;
- CTA label and href;
- badges/eyebrows that are presentation content;
- layout visibility, ordering and supported spacing/alignment controls;
- reusable style/preset selections.

Do not put price, inventory, review score, compatibility truth, payment status or similar business authority into static template copy.

## Shared capability rule

Before adding a template-specific component, ask whether an existing shared component can represent the required UI. If one small capability is missing, extend the shared contract backward-compatibly. Do not add a Playroom-only renderer branch simply to match one screenshot.

## Page-family continuity

The remaining Playroom pages must look like pages of the same storefront, not separately designed demos. Carry forward:

- the same header/footer family;
- the same palette and surface tokens;
- the same border radius family;
- the same heading hierarchy;
- the same card depth/glow discipline;
- the same media treatment;
- the same CTA hierarchy;
- the same navigation/search language;
- the same mobile/tablet inheritance strategy.

However, every page must use a composition appropriate to its job. Product detail should not be a miniature homepage; checkout should prioritize task completion; FAQ should prioritize readability; blog should prioritize editorial hierarchy.

## Required Playroom page direction

### Collection / catalog

Strong collection hero or heading, gaming-specific discovery/filter context, high-quality product grid, meaningful category/platform navigation, compact promo/editorial inserts where supported. Keep catalog data authoritative.

### Product detail

Large product gallery/media region, strong title/price/variant/add-to-cart hierarchy, compatibility/status help, delivery/trust information, related/up-sell content and expandable supporting details. Presentation may be neon/dark; purchase controls must remain exceptionally clear.

### Cart

Clear line-item hierarchy, strong order summary, restrained gaming styling, obvious quantity/remove controls and checkout CTA. No visual spectacle that competes with completion.

### Checkout

Use the canonical guided accordion flow: Cart -> Shipping -> Payment -> Summary. Only active step expanded; completed steps show concise summaries/check state. Desktop keeps persistent order summary. Playroom styling decorates the flow but never reduces form readability.

### Search

Search-first composition, query/result clarity, filter/refinement support, empty/no-result states and category/platform shortcuts.

### Account / authentication

Dark premium shell with highly readable forms, concise assistance and clear success/error states.

### Blog / magazine

Editorial gaming-magazine hierarchy: strong feature story media, secondary story grid and readable article typography. Must remain Builder-editable.

### FAQ / help

High-contrast accordion/help groups, search or topical navigation when available, calm visual density.

### Legal / policy / generic content

Use the Playroom shell and typography, but prioritize long-form readability over neon effects.

## Section preset philosophy

Presets are not screenshots and not hardcoded page replicas. A useful preset is a reusable composition of shared Page Schema components that a merchant can insert and then edit.

Playroom presets should cover recurring patterns such as:

- neon image hero with independent copy and CTA;
- split feature / setup story;
- platform icon selector;
- play-style choice selector;
- media card grid;
- featured commerce product grid wrapper;
- compatibility + help panel;
- gift/promo split panel;
- community / editorial CTA strip;
- trust strip;
- gaming magazine feature row;
- FAQ accordion group;
- product-story / accessory cross-sell row.

Each preset must preserve independent editable media/text/CTA fields, use shared components, avoid fabricated commerce authority and work within the Builder's isolated Desktop / Tablet / Mobile authority model.

## Acceptance gate for each Playroom page

A page is not accepted because tests pass. It is accepted when all of the following are true:

1. runtime/schema validation passes;
2. Builder can edit merchant-meaningful content without code changes;
3. commerce authority remains correctly bound;
4. the page clearly belongs to the accepted Playroom visual family;
5. its information architecture suits the page purpose;
6. desktop screenshot has been visually inspected;
7. responsive behavior has no obvious breakage;
8. no new template-specific engine was introduced without necessity;
9. canonical package/version and upgrade behavior are explicit and tested.

## Workflow for future templates

Do not repeat the Playroom process template-by-template from scratch. For each new template:

1. lock the intended visual language and page hierarchy;
2. implement one representative page to acceptance;
3. document its transferable design rules;
4. build the remaining page family from those rules;
5. create reusable section presets while the design system is still fresh;
6. validate Builder editability and data authority;
7. run exact-head screenshot QA;
8. only then declare that template complete and move to the next template.

The goal is not to make every template look like Playroom. The goal is to reuse the disciplined implementation method that finally made Playroom successful.
