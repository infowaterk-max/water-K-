# Story direct-root contrast incident — 2026-09-23

## Context

During Loot Vault launch-quality re-acceptance, the automated 14×3 Template Factory matrix reached zero blocking errors, but human review of the exact-head screenshots still showed unreadable dark headings on the near-black Loot Vault canvas.

Affected examples included the Home `story.hero`, Home `story.feature`, Join-the-Hunt feature, and the Product editorial story block.

## Root cause

The shared `story.hero` and `story.feature` renderers explicitly used the active template muted-text token for paragraph copy, but the copy containers did not bind their inherited text color to `--shoporation-color-text`.

When these Story components were direct Page Schema roots, there was no `layout.section` tone wrapper to establish the correct inherited text color. They therefore inherited the surrounding application/body color instead of the active storefront template color.

The same Story components rendered correctly when nested inside a shared section wrapper, which confirmed that the defect was inherited color authority rather than Loot Vault palette data.

## Resolution

The shared Story renderer now binds both Hero and Feature copy containers to:

`color: var(--shoporation-color-text, #171717)`

This keeps headings, eyebrow copy and inheriting CTAs on the active template text authority while existing paragraph-specific muted and accent tokens remain unchanged.

No template-local renderer, CSS fork, wrapper identity rewrite or commerce authority was introduced.

## Prevention contract

1. A reusable storefront component that paints its own canvas or can legally appear as a Page Schema root must not depend on an unrelated application/body text color.
2. Direct-root Story components must resolve inheriting typography from storefront design tokens.
3. Green automated visual gates do not replace human screenshot review for contrast and hierarchy; zero blocking errors can coexist with a visually unacceptable result.
4. Shared renderer defects must be fixed once in the shared renderer and re-proven cross-template rather than compensated in each template.
5. Stable node/component identity must not be changed merely to obtain color inheritance from an added wrapper.

## Required proof

- exact-head CI PASS;
- Template Factory full matrix PASS for the affected candidate and shared-runtime canary coverage;
- Vercel Preview READY for the same exact SHA;
- human review of regenerated Home/Product mobile and desktop screenshots before Product Owner acceptance.
