# Template Factory Scaffold v1 — skeleton-preview prevention

Status: design_decision / implemented shared foundation

Area: Builder / Template Factory / visual acceptance

## Symptom

A technically green template candidate reached Product Owner review while still visually equivalent to a structural wireframe: missing representative imagery, weak template-specific effects and insufficient fidelity to the previously accepted visual reference.

## Root cause

The former workflow conflated two independent states:

- technically valid Page Schema / Runtime candidate;
- finished storefront template ready for visual acceptance.

The system had no compiled separation between shared platform foundation, category foundation, template-specific recipe and media/reference completeness.

## Resolution

Introduce Template Factory Scaffold v1:

`Platform Foundation → Category Foundation → Template Recipe → Media Manifest → deterministic 14-page build → technical QA → internal visual review → Product Owner preview`.

The compiler starts from one accepted category foundation and produces a new target identity without source-file copy drift.

Product Owner readiness is fail-closed on reference-critical page ownership, media coverage, foundation-leak detection and explicit internal visual review.

## Prevention

- Never treat a 14×3 green browser matrix as proof of finished visual quality.
- Never expose category-foundation brand/media under a new template identity.
- Reference-critical pages must be explicit template-owned overrides.
- Demo media must be declared, wired and counted through a media manifest.
- A generated candidate is not catalog authority until its complete accepted package is frozen as a canonical snapshot.
- Future categories must register an accepted category foundation before using the one-call Factory build.

Risk: medium — Builder/template-system only.
