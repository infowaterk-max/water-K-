# Template Factory Scaffold v1 hardening — 2026-09-23

## Purpose

This hardening sits on top of the canonical Scaffold v1 merged in PR #358. It does not introduce a second Factory.

It closes three remaining gaps needed for repeatable near-finished template production.

### Automatic foundation brand neutralization

Inherited pages no longer require hand-written search/replace of the accepted category foundation brand. The category foundation declares its brand tokens and the compiler rewrites those tokens to the target recipe display name after stable node identity is rewritten.

Reference-critical pages are still required to be explicit template-owned overrides. Automatic brand neutralization is not permission to inherit Home/Catalog/PDP visual identity.

### Explicit media production requirements

The media manifest can now define per-role minimum counts and aspect-ratio targets. This turns “add some images later” into a machine-readable production plan.

Loot Vault v2 requires at minimum:

- 1 hero · 16:9;
- 6 category/universe assets · 4:5;
- 4 product assets · 4:5;
- 2 editorial scenes · 3:2;
- 1 supporting background · 16:9;
- 14 representative assets total;
- no placeholder SVG.

### One-call recipe registry

A registered template candidate can be built by template key through one Factory call. The registry never fabricates missing recipes.

Loot Vault v2 is the first registered canary. Its media pack and page overrides are intentionally incomplete, therefore Product Owner readiness remains fail-closed.

## Next step

Populate the Loot Vault reference-critical page overrides and representative media pack against the accepted 2026-09-06 visual reference, run technical QA and internal screenshot review, then and only then set the review state to passed and expose Product Owner preview.
