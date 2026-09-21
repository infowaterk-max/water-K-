# Storefront Template Route Integrity + Demo Content Contract

Status: **canonical Template Factory contract**

This contract is inherited by every storefront template produced or re-accepted after 2026-09-21. It applies to Playroom and the remaining portfolio; it is not a template-local convention.

## 1. No decorative dead links

A template may not ship a header, footer, CTA, card or navigation destination that is only visually plausible.

Every internal link must resolve to one of:

- a known Shoperation storefront route;
- a supported catalog deep-link contract;
- a dynamic content route backed by a demo content fixture;
- a runtime entity route such as an actual product destination;
- an in-page anchor.

`evaluateStorefrontTemplateRouteIntegrity()` is a hard acceptance gate.

## 2. Dynamic content links require content

Every static `/oldal/<slug>` or `/blog/<slug>` destination must have a namespaced content fixture. Missing fixtures are generated at the shared catalog boundary so old packages can remain resolvable, but Template Factory authors should still provide intentional copy for template-specific pages.

Common service pages use shared Hungarian demo copy:

- Szállítás
- Fizetés
- Visszaküldés
- Rólunk
- Fenntarthatóság
- Karrier

Template-specific destinations receive a safe editable starter structure.

## 3. Demo content is never business truth

Every template demo content surface uses the canonical warning:

> Minta tartalom – ez az oldal előre generált szöveget tartalmaz, és nem tekinthető a webshop valós működésének vagy feltételeinek. Ellenőrizd és igazítsd a saját működésedhez publikálás előtt.

The warning is system UI, not editable body copy.

## 4. Preview must remain inside the selected template

Template Preview rewrites known storefront links back to the same immutable template/version and matching Page Schema page type. A merchant evaluating a template must be able to browse Home → Catalog → Product → Cart → Checkout → Account → Blog/Content without silently leaving the selected template.

Demo `/oldal/<slug>` and `/blog/<slug>` pages render the selected template's Content/Blog Article preset with the fixture data and warning banner.

## 5. Installation creates drafts, never automatic live claims

Template installation may materialize template demo content only as tenant-scoped CMS **drafts**.

Provenance states:

- `fixture`: untouched generated demo;
- `adopted`: merchant-edited content, now merchant-owned;
- `retired`: stale untouched fixture from an older template namespace.

Rules:

- fixture refresh may update only untouched fixture records;
- adopted content is never overwritten or retired by template changes;
- an existing merchant-owned slug always wins;
- publishing is always a separate merchant action;
- if a fixture is published without content edits, the warning remains visible.

## 6. Template switching

Switching templates may retire only untouched fixtures from stale namespaces. Products, variants, customers, orders, B2B records and merchant-authored content remain outside template authority.

## 7. Catalog deep links

Template links may use only the supported public catalog query contract. The shared catalog consumes these parameters; unsupported query keys fail the Route Integrity Gate instead of degrading into a no-op link.

## Acceptance rule

A template is not portfolio-accepted until:

1. Page Schema validation passes;
2. responsive visual acceptance passes;
3. Route Integrity Gate passes;
4. every dynamic content target has demo content;
5. preview navigation stays within the selected template;
6. demo fixture persistence remains draft-only and provenance-safe.