# Storefront Cookie Consent Template Composition Rule — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: all implemented and future storefront templates

## Non-negotiable invariant

SHARED COOKIE CONSENT BEHAVIOR + TEMPLATE-OWNED COOKIE CONSENT PRESET.

Consent behavior is platform authority. Visual composition is template authority.

A generic beige/white cookie banner with token recoloring is not final template acceptance.

## Shared behavior authority

The shared CookieConsent surface owns:
- necessary-storage versus analytics consent;
- consent persistence;
- analytics activation only after consent;
- rejection behavior;
- privacy-policy navigation;
- accessibility semantics;
- safe responsive containment.

Templates MUST NOT fork or replace this behavior.

## Template presentation authority

Every implemented template key MUST have one explicit cookie consent preset in:
- `src/lib/builder/storefront-cookie-consent-presets.ts`

Each preset has a unique preset id and owns presentation choices such as:
- composition/layout;
- alignment;
- width;
- radius;
- border treatment;
- shadow/backdrop treatment;
- title treatment;
- safe visual fallback tokens.

The active storefront design tokens still override the preset fallbacks. The preset therefore provides a deterministic template-specific composition and a safe template-colored first render.

Every StorefrontRuntime root MUST expose the active template identity through `data-storefront-template` and `data-storefront-template-version`. System overlays must resolve presentation from that identity; they must not guess the template from route names or page-local CSS.

## Strict catalog gate

Current template packages cannot enter the implemented template catalog without a cookie consent preset.

Missing preset is a hard failure:
- `STOREFRONT_COOKIE_PRESET_REQUIRED:<templateKey>`

For every new template:
1. create the template package;
2. create its cookie consent preset;
3. prove desktop/tablet/mobile behavior;
4. only then allow catalog/final acceptance.

This applies to the complete 42-template target.

## Browser acceptance

Template Factory browser acceptance must prove:
- exactly one visible shared cookie surface while consent is unknown;
- `data-cookie-template-key` equals the rendered template key;
- a non-generic `data-cookie-preset` is active;
- a template layout is declared;
- the surface remains visible and inside the viewport.

Cookie acceptance must run before the banner is hidden for ordinary golden-page screenshots.

## Fallback policy

A generic safe fallback remains only as a runtime safety net for non-storefront/system contexts.

It is NOT an accepted storefront state and MUST fail template acceptance if reached on an implemented storefront template.

## Defect classification

If a storefront cookie appears in generic styling, first classify it as:
`shared template-system-surface inheritance violation`.

Do not repair the page locally.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
