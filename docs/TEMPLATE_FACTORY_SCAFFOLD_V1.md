# Shoperation Template Factory Scaffold v1

Status: implementation foundation.

## Objective

New storefront templates must no longer start as Product Owner-visible wireframes.

The Factory compiles a complete installable template package from a small set of explicit authorities:

`Accepted Category Foundation → Template Recipe → Media Manifest → Demo Content → Build → Technical QA → Internal Visual Review → Product Owner Preview`.

This is the technical equivalent of copying a proven base and applying the new template, without creating source-file clones that drift over time.

## Layer 1 — Platform Foundation

Owned by the shared Shoperation Builder/Runtime:

- canonical 14 Page Schema types;
- shared commerce/auth/cart/checkout/account behavior;
- responsive authority and breakpoints;
- component registry and binding namespaces;
- installation/demo-content lifecycle;
- accessibility and layout contracts.

A template recipe cannot redefine these authorities.

## Layer 2 — Category Foundation

A category foundation is an accepted, proven template family used as structural commerce input.

v1 starts with:

- category: `gaming`;
- accepted foundation: `gaming.playroom@20`.

The foundation declares which pages are normally template-owned and which pages are normally inherited.

For Gaming v1:

- recommended template-owned: Home, Catalog, Product, Blog Index, Blog Article;
- normally inherited: Cart, Checkout, Account, Search, Content, FAQ, Contact, Legal, Not Found.

This is guidance, not permission to ship inherited visual identity.

## Layer 3 — Template Recipe

The recipe contains only template-specific authority:

- target key/version;
- global design tokens;
- canonical shell rebrand/config;
- page overrides for template-distinct surfaces;
- bounded node patches;
- demo fixtures;
- approved visual-reference key;
- media manifest.

The compiler rewrites template identity, page keys and node identity deterministically.

## Layer 4 — Media Manifest

Product Owner-ready templates require explicit representative media.

Each asset declares:

- stable key;
- role: hero/category/product/editorial/background/decorative;
- source;
- alt text;
- page types using it;
- whether it counts as representative media.

The readiness gate blocks:

- insufficient representative media;
- missing required media roles;
- duplicate media identities;
- declared assets that are not actually wired into their target page;
- placeholder SVG when the template forbids it.

A real template may set a much higher threshold than the test canary. Loot Vault target: at least 14 representative media assets.

## Foundation-leak protection

A compiled template cannot silently remain the previous template under a new key.

Category foundations declare forbidden leakage tokens. Gaming currently blocks Playroom-specific brand/media tokens when the target template is not Playroom.

Product Owner readiness therefore fails if compiled output still contains foundation-specific artwork or brand identity.

## Visual-reference ownership

Pages explicitly required by the approved visual reference must be template-owned overrides. They cannot pass Product Owner readiness by inheriting the category foundation unchanged.

For image-led storefronts this normally means at least Home/Catalog/Product; the template brief may require more.

## Product Owner readiness

Technical build success is necessary but not sufficient.

`assertStorefrontTemplateFactoryProductOwnerReady()` remains fail-closed until:

- all 14 canonical pages exist exactly once;
- every page has target template identity;
- declared recipe patches resolve;
- required reference pages are owned;
- media coverage passes;
- category-foundation brand/media leakage is absent;
- internal visual-reference screenshot review has explicitly passed.

Only after this gate may a candidate be surfaced as Product Owner preview.

## One-call build

Application code calls:

`buildStorefrontTemplateFactoryCandidate(recipe)`

The category foundation is resolved centrally. The caller does not copy a 14-page source tree.

## Current boundary

Scaffold v1 intentionally does not auto-register compiled candidates in the live Template Catalog.

Promotion remains explicit:

1. build candidate;
2. technical gate;
3. visual-reference implementation;
4. internal screenshot review;
5. Product Owner review;
6. freeze full canonical snapshot;
7. register the accepted snapshot.

This prevents a generator bug or unfinished recipe from becoming installable storefront authority.
