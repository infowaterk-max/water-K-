# Storefront contact Runtime continuity — 2026-09-22

## Incident

Human Playroom v20 acceptance showed that `/kapcsolat` rendered the historical hard-coded contact page instead of the active template contact Page Schema.

Visible consequences:

- Playroom header/footer and dark visual language disappeared;
- the legacy global `.cards` form layout produced overlapping mobile labels/fields;
- the legacy “Gyors segítség” section inherited incompatible light-theme contrast and button colors;
- the already-existing shared `support.contact-form` runtime renderer was bypassed.

## Root cause

The contact template preset and shared support engine were already implemented. The public `src/app/kapcsolat/page.tsx` route did not resolve or render the persisted `contact` Page Schema.

## Shared fix

- Public static storefront pages use one resolver authority for `content` and `contact`.
- Preview deployments read the exact tenant draft; normal storefronts read the published page.
- `/kapcsolat` renders `StorefrontResponsiveRuntime` first and retains the old route only as a compatibility fallback for tenants without a persisted contact Page Schema.
- The shared `support.contact-form` renderer remains the ticket-form presentation/interaction authority; no Playroom-only form CSS is introduced.

## Regression invariant

**SYSTEM STOREFRONT ROUTES MUST NOT BYPASS AN AVAILABLE PAGE SCHEMA PRESET.**

A template-owned contact page must retain the active template shell, tokens and responsive runtime while the support submission API/RPC remains shared platform authority.

ONE DEFECT → ONE SHARED FIX → REGRESSION TEST → TEMPLATE FACTORY QUALITY GATE.


## Human retest follow-up — Playroom v20 contact composition

The shared Runtime continuity fix passed its visual retest, but the Playroom v20 contact preset exposed two template-local defects:

- two remaining customer-facing English eyebrow labels: `BE READY` and `GENERAL`;
- the generic v19 responsive helper widened 4-column contact cards to 5 columns at tablet width, so the intended 8/4 hero pair and 4/4/4 support-card row wrapped into orphan tiles in tablet / mobile “desktop site” rendering.

Classification: **template-local composition defect**, not shared Runtime authority failure.

Fix:

- Playroom v20 localization maps `BE READY → KÉSZÜLJ FEL` and `GENERAL → ÁLTALÁNOS`;
- Playroom v20 contact-only responsive overrides preserve the intended 8/4 hero split and 4/4/4 support-card row on tablet, with 12-column stacking on mobile;
- the shared grid engine and the already accepted v19 template remain unchanged.

Regression invariant:

**A localized template must not leak untranslated customer-facing preset labels, and contact-specific responsive intent must not be rewritten by a generic helper when it creates orphan cards.**


## Human retest follow-up — shared validation feedback

A later human retest exposed a separate shared support-form defect:

- the submit button appeared enabled on an empty or incomplete form;
- native browser `required` / `minLength` validation blocked the submit event before the shared React submit handler could run;
- as a result, the Shoperation feedback region never received an error message, so empty, name-only or one-character-message attempts looked like a dead button.

Classification: **shared support interaction defect**.

Fix:

- the shared support form computes readiness from the same minimum contract as the support API: valid e-mail, subject length >= 3, message length >= 10;
- submit is disabled and visually inactive until the form is ready;
- the form uses explicit shared validation feedback instead of relying on opaque browser-native blocking;
- the submit handler validates again before any `/api/support` request;
- server-side Zod validation and the canonical `create_support_ticket_v2` authority remain unchanged.

Regression invariant:

**A storefront form must never look actionable while its own required contract is knowingly unsatisfied, and client-side validation must produce visible Shoperation feedback rather than silently preventing submission.**
