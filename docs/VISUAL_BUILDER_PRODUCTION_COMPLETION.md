# Visual Builder – Production Completion

This round closes the merchant-facing production gaps found on the live Builder after PR #315.

## Scope

No new Page Schema, Storefront Runtime, commerce, publication, responsive, preset, Saved Block, Global Element or AI authority is introduced.

The production workspace now:

- presents one unambiguous Desktop / Tablet / Mobil active state;
- keeps canvas, breakpoint context and responsive inspector on the same viewport state;
- resolves externally bound merchant data before displaying Inspector values;
- marks externally authoritative values as read-only instead of exposing stale template fallbacks;
- synchronizes editable bound fallback content by composing the existing `config` and `binding` Builder mutations into one history step;
- removes page keys and component keys from Normal merchant surfaces;
- localizes common component, field and group labels;
- replaces raw responsive-mode identifiers in the Add library with merchant labels;
- improves floating toolbar enabled/disabled contrast;
- keeps the existing templates, presets, Saved Blocks, Global Elements, Fidelity, Design Guard and publication controls unchanged in authority;
- keeps AI Builder dark-launched.

## Production gate

Merge and production deployment are authorized only after exact-head CI, production build and post-deploy health verification pass.
