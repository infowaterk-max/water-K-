# Shoperation Template Factory v1

## Goal

A new storefront template must no longer begin as a hand-built 14-page wireframe.

The factory composes a complete working package from five authorities:

`Foundation + Category Recipe + Template DNA + Reference Contract + Media Pack`

The result is a 14-page Page Schema package with the shared commerce shell, responsive materialization and working shared commerce surfaces already present before template-specific polish begins.

## Layers

### 1. Foundation

Shared and not copied per template:

- Runtime and Page Schema;
- 14 canonical page types;
- shared commerce header/footer;
- catalog, PDP, cart, checkout, account, search and information-page foundations;
- Desktop/Tablet/Mobile materialization;
- common binding and commerce authority.

### 2. Category Recipe

Reusable within a category. It owns defaults such as:

- product image ratio;
- catalog density;
- PDP gallery/buybox split;
- default merchandising presentation;
- editorial tone.

A Gaming recipe is introduced as the first canary.

### 3. Template DNA

Template-owned and merchant-editable visual tokens:

- palette;
- typography;
- radius;
- spacing rhythm;
- surfaces;
- visual character metadata.

### 4. Reference Contract

An accepted design image/brief is an input authority, not optional inspiration.

It declares required visual media roles, minimum representative media coverage and placeholder restrictions.

### 5. Media Pack

Hero, category, product and editorial media belong to the template definition. Product Owner review cannot open when the reference/media contract is incomplete.

## Product Owner boundary

Technical green status is necessary but not sufficient.

A factory package may be used internally for machine QA while `productOwnerReady=false`. Product Owner preview opens only after the template definition satisfies the reference/media contract and internal screenshot review promotes the quality manifest.

## Expected workflow for the remaining templates

1. choose/category recipe;
2. attach accepted reference;
3. define Template DNA;
4. prepare representative media pack;
5. run one factory build;
6. run automatic 14×3 QA;
7. internal screenshot comparison against reference;
8. targeted polish;
9. Product Owner preview;
10. acceptance and golden snapshot.

The intended outcome is a near-finished first review, not a wireframe review.
