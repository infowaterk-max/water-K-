# Template Factory Identity Rewrite v1

Status: shared Factory hardening

## Problem

Template Factory Scaffold v1 correctly reused the accepted Playroom package as the Gaming category foundation, but inspection showed that each normally inherited page still carried 5–7 Playroom brand tokens and the Playroom logo.

Without automation, every Gaming template would have required manual brand cleanup on nine otherwise reusable pages.

## Resolution

Category foundations now declare source identity authority and template recipes declare target identity authority.

For inherited pages only, the compiler automatically rewrites:

- foundation brand label → target brand label;
- foundation uppercase brand label → target uppercase brand label;
- foundation logo URL → target logo URL.

The canonical commerce header is then patched from the same target identity.

Template-owned/reference-critical pages remain explicit and are not auto-rewritten.

## Prevention contract

1. Inherited pages may reuse structure, never the predecessor's visible brand.
2. Identity rewrite must happen before final foundation-leak validation.
3. Reference-critical Home/Catalog/Product-style surfaces remain template-owned.
4. A category foundation's source identity must be explicit; do not hard-code Playroom knowledge in generic compiler logic.
5. A target recipe owns one coherent identity used across all 14 pages.
6. Foundation-leak detection remains fail-closed after automatic rewriting.

Risk: Medium — builder-template-system only.
