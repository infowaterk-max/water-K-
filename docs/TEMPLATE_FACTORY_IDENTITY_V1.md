# Template Factory Identity Rewrite v1

## Goal

Category foundations may contain accepted structural shell and commerce composition, but inherited pages must not force every new template to manually remove the foundation brand.

Identity Rewrite v1 makes the common path:

`5 category-distinct pages + 9 inherited pages → one coherent 14-page target template`.

For Gaming v1 the recommended template-owned pages are:

- Home;
- Catalog;
- Product;
- Blog Index;
- Blog Article.

The remaining Search, Cart, Checkout, Account, Content, FAQ, Contact, Legal and Not Found pages inherit their proven Page Schema structure from the accepted Gaming foundation.

## Foundation identity authority

Each category foundation declares its source identity:

- source brand label;
- uppercase source brand label;
- source logo asset.

Gaming currently declares:

- `Playroom`;
- `PLAYROOM`;
- `/storefront/playroom/brand-mark.svg`.

## Target identity authority

Every template recipe declares:

- `brandLabel`;
- `brandLabelUpper`;
- `tagline`;
- `logoUrl`;
- `logoAlt`.

When a page is inherited rather than explicitly overridden, the compiler recursively rewrites the declared foundation identity into the target identity before node IDs, global styles and shell configuration are applied.

Template-owned pages are not rewritten this way: their visual/textual identity is part of the template recipe and remains explicit.

## Safety

The existing foundation-leak checks remain active after the rewrite.

Therefore the compiler must still end with no forbidden Playroom brand/media tokens in a non-Playroom Gaming template.

The rewrite does not:

- alter binding paths;
- change commerce authority;
- alter database state;
- infer product truth;
- replace reference-critical page ownership;
- auto-register generated output in Template Catalog.

## Expected outcome

A new Gaming template should normally require deep design work only on the pages where the accepted reference actually differs.

Stable commerce pages reuse the accepted structure and receive target brand, design tokens and shell identity automatically.

This is the intended technical form of the Product Owner's "copy the proven base, apply the current template properties, then spend time on the genuinely unique template elements" workflow.
