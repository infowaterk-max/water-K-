# Template Factory Canonical Hardening — 2026-09-22

## Purpose

This contract exists so Shoperation does not spend a week re-learning the same responsive, persistence and version-authority failures on every storefront template.

The accepted operating model is:

**one current canonical template package → 14 complete Page Schema pages → explicit Desktop/Tablet/Mobile effective styles → demo content → targeted polish → proof → freeze.**

Historical template versions are evidence/history, not runtime composition layers.

## 1. Current-version-only canonical authority

For a template key there is exactly one active canonical package in Template Library and the active resolver.

Playroom authority is now:

- template key: `gaming.playroom`
- active version: `20`
- pages: 14 / 14
- source policy: `self-contained-complete-package`
- responsive policy: `explicit-effective-viewports`

`playroom-v20.ts` does not compose v19/v18/reference/fidelity/desktop-polish sources. The complete package is frozen in `playroom-v20-canonical-package.json`.

Historical Playroom sources remain in Git history/source evidence only and are not active resolver authorities.

### Version transition rule

A future v21 must be created from the **complete v20 canonical authority**, then modified and frozen as a complete v21 package.

After v21 acceptance:

1. v21 becomes the only active resolver/Template Library authority;
2. v20 becomes archive/history;
3. v21 must not import v20 at runtime;
4. persisted-store migrations, if ever needed for real merchants, must be explicit and separate from template composition.

Forbidden pattern:

`v21 = v20 + v19 patch + old fidelity patch + new overrides`

Accepted pattern:

`complete v20 → authoring copy → v21 changes → proof → complete frozen v21`

## 2. Responsive Isolation Contract

The current Runtime/Builder responsive authority is **v2: `base + exact viewport`**.

For every viewport-aware visual/composition domain:

- Desktop resolves from `base + desktop`;
- Tablet resolves from `base + tablet`;
- Mobile resolves from `base + mobile`;
- Desktop does not cascade into Tablet or Mobile;
- Tablet does not cascade into Mobile.

This rule applies to:

- visual `style` and `styleSlots`;
- `responsive.gridSpan` and `responsive.hidden`;
- typography;
- image art direction;
- responsive section order;
- responsive child order.

Historical template source packages authored under the old `base → desktop → tablet → mobile` cascade are converted **once** at the template catalog/migration boundary by `materializeStorefrontTemplateResponsiveStyles`. The migration helper resolves the old effective rendering and writes explicit Desktop/Tablet/Mobile authorities so the visual result is preserved before the current Runtime sees the package.

Ordinary Visual Builder draft persistence **does not materialize responsive values again**. Sparse Builder overrides remain sparse. Therefore “reset viewport override” is real: clearing a viewport-specific override falls back to the global/base or component default instead of silently recreating the deleted value during save.

### Required invariant

A Desktop-only edit must not change effective Tablet or Mobile rendering.

A Tablet-only edit must not change Desktop or Mobile rendering.

A Mobile-only edit must not change Desktop or Tablet rendering.

`assertStorefrontViewportIsolation` compares the complete effective viewport state, including style, grid/visibility, typography, art direction, section order and child order.

The Template Factory quality manifest requires complete explicit viewport authorities at the canonical template boundary. Missing materialization is a quality-gate failure.

## 3. Targeted Page Schema Change Contract

Local polish must not regenerate and overwrite an entire persisted page when only specific nodes need to change.

Canonical utilities:

- `diffStorefrontPageDocument`
- `assertStorefrontTargetedPageChange`
- `replaceStorefrontPageNodesById`
- `saveCurrentStorefrontTargetedPageDraft`

A targeted change fails closed if:

- an unrelated node changes;
- an unexpected node is inserted or removed;
- page/template metadata drifts without explicit authority;
- optimistic draft revision does not match.

This preserves merchant/persisted state outside the intended subtree.

Full-page/full-template refresh is reserved for explicit template installation/version promotion, not ordinary visual polish.

## 4. Template production workflow

For the next template:

1. create/choose the complete 14-page canonical package;
2. apply the template-specific visual language to the page family;
3. install opt-in demo content;
4. verify shared commerce/auth/content contracts;
5. run Desktop / Tablet / Mobile proof;
6. perform only targeted polish;
7. promote/freeze the complete package as the single current canonical authority.

The desired steady-state is **one or two polish passes**, not repeated architecture repair.

## 5. Mandatory gates

Template Factory Quality Gate must prove:

- exact current package;
- all 14 canonical page types;
- Desktop / Tablet / Mobile browser matrix;
- explicit responsive style materialization;
- Builder and storefront use the same Runtime renderer;
- no responsive isolation leak;
- canonical shell consistency;
- route integrity;
- demo-content contract;
- Playroom/current-template source authority tests;
- targeted Page Schema mutation guard tests.

Human acceptance remains required for visual quality. Automated PASS proves contracts; it does not replace visual judgement.

## 6. Playroom accepted baseline

The current Playroom Home retains:

- Desktop Hero + selectors: 22rem;
- Desktop Gift: 19.25rem;
- Desktop Compatibility: 15.5rem;
- Desktop Community: 14.8rem;
- accepted mobile Home responsive recovery;
- Finder 6/3/2;
- platform selector responsive behavior;
- semantic SVG icon system;
- shared carousel behavior;
- compatibility fail-closed behavior;
- Hungarian copy;
- newsletter readiness;
- Contact HUMAN PASS;
- demo-content foundation.

Do not reopen these without a concrete regression or a new explicitly approved design change.

## 7. Core rule

**Fix the factory once; do not repair the same class of defect template by template.**

If a defect can recur across templates, convert the lesson into a shared contract, helper, persistence boundary or quality gate before continuing the 42-template production line.
