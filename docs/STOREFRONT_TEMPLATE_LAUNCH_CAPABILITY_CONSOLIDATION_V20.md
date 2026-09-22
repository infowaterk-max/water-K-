# Storefront Template Launch Capability Consolidation — Playroom v20

Status: canonical launch checkpoint reconstructed from the accepted Shoperation template, Builder, Alap/Pro, Special Commerce and add-on decisions.

## Why this checkpoint exists

Template versions must represent meaningful factory composition/schema revisions, not a running count of every engine capability added later. Shoperation must not reach artificial `v50+` or `v128` template versions because shared runtime features were discovered one by one.

Playroom v20 is therefore one deliberate consolidation release over the accepted v19 visual family. v19 remains exactly resolvable as historical authority.

## Canonical template model

- Shoperation storefronts are native Next.js/React, Page-Schema/component driven and Visual-Builder editable.
- The accepted portfolio target is **42 distinct visual designs** (14 categories × 3 genuinely different template families).
- Alap and Pro do **not** mean lower- and higher-quality skins.
- The same design family is usable in Alap and Pro; the tenant's entitlement decides which shared motor capabilities are available.
- Pro capability must come from the common component/runtime entitlement authority, never from scattered `if (plan === 'pro')` template branches.
- The Builder remains available in both plans.

## Versioning policy from v20 onward

A template version bump is required only when the template's source-controlled factory Page Schema, factory composition, schema contract, or explicit template migration changes.

A template version bump is **not** required merely because:

- a new shared add-on/provider becomes compatible with an existing semantic insertion point;
- a shared Pro capability becomes available to an entitled tenant;
- a common runtime engine receives a backward-compatible improvement;
- a contextual Builder discovery card is added for an already supported semantic context.

This policy keeps persisted storefront identity stable while allowing the shared engine to evolve.

## Shared design and Builder contract

- 12-column shared grid and responsive Desktop/Tablet/Mobile inheritance.
- Hero/banner media, copy and CTA remain separate editable nodes.
- Global Styles are current live design authority for colors, typography, spacing and radii.
- Preset Library, Saved Blocks, Linked Symbols/Global Elements, Design Guard and Publish Readiness remain shared Builder capabilities.
- Add-ons inherit the **current** storefront design state, not a frozen copy of the original factory skin.
- Business truth (price, stock, compatibility, payment/shipping state, order state) never becomes decorative editable content.

## Capability discoverability contract

A feature is not product-complete if a normal merchant cannot discover it where it naturally belongs.

The shared contextual capability resolver therefore combines:

1. page semantic contexts;
2. the template's accepted Special Commerce policy;
3. real component manifests;
4. the tenant's actual Alap/Pro entitlement.

The Builder may show both available and locked Pro opportunities contextually. Locked capability awareness is informational; it never bypasses the runtime gate.

## Playroom v20 factory additions

### Home

Adds a real Builder-native `marketing.newsletter-signup` section before the footer. Submission continues to use the existing `/api/marketing/newsletter` and `marketing_consents` authority.

### Contact

Adds a real Builder-native `support.contact-form` section. Submission continues to use the existing `/api/support` endpoint and atomic tenant-scoped support ticket authority (`create_support_ticket_v2`).

### All pages

Carry semantic insertion contexts plus the current-theme add-on integration contract. This allows later shared capabilities to attach without a template-local engine or needless version bump.

## Alap / Pro behavior

The Playroom package remains `minPlan=alap`. Its factory-required capabilities are Alap-safe.

Examples of entitlement-aware behavior:

- guided finder, composer, configurator, compatibility and release engines appear according to their real manifests and Playroom policy;
- `commerce.interactive-scene` remains a real Pro component requiring `interactiveSceneCommerce`;
- an Alap tenant can discover that contextual Pro capability but cannot insert/render it through the runtime gate;
- a Pro tenant sees it as available in the same Playroom design family;
- no separate Pro skin or duplicate commerce engine is created.

## Checkout

Canonical flow remains:

**Cart → Shipping → Payment → Summary**

Shipping and payment providers stay inside their semantic checkout steps. The template supplies design/composition; provider and checkout authority remain shared.

## Intentionally deferred — not launch blockers for this consolidation

- public AI Builder activation (kept dark/controlled until explicitly released);
- AR / advanced 3D / exploded-view premium add-ons where category-relevant;
- Digital Commerce/download products;
- product document attachments.

These must integrate through shared capability/insertion contracts when implemented; they must not force old templates to be cloned merely to become compatible.

## Portfolio status

The source-controlled catalog currently contains fewer concrete packages than the accepted 42-design launch target. Missing template families must be implemented as real source packages; fabricated catalog entries are forbidden. This capability consolidation does not pretend the 42-template portfolio gap is closed.

## Acceptance gate

Playroom v20 is not accepted until:

- v1/v2/v18/v19 remain exactly resolvable;
- v20 is the only merchant-facing latest Playroom entry;
- all 14 pages validate under Alap and Pro capability contexts;
- Home newsletter and Contact support form use existing shared server authorities;
- contextual discovery shows Pro-only capability as locked on Alap and available on Pro;
- current theme token inheritance remains intact;
- section presets include the new factory sections;
- exact-head CI is green;
- all 14 desktop screenshots are captured and visually reviewed before merge/production.
