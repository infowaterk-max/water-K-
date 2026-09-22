# Roadmap Catch-up Gate — cross-cutting foundation debt

## Why this gate exists

Later roadmap decisions promoted a small set of cross-cutting contracts ahead of their original implementation blocks. This gate closes those debts without renumbering the roadmap and without pulling the real Page Schema/Templates or Visual Builder implementation forward.

## Scope

1. **Integration Setup UX Contract**
   - payment, shipping and invoicing setup follows selection-first progressive disclosure;
   - provider choice is shown before contract/credential/verification details;
   - only the selected provider exposes its detailed setup and actions;
   - existing server-side provider secrets, verification and audit behavior remain authoritative.

2. **Builder Compatibility Foundation v1**
   - shared 12-column layout/grid contract and responsive inheritance;
   - semantic storefront design-token keys;
   - stable page-type vocabulary and Page Schema compatibility contract;
   - versioned component manifest contract with Alap/Pro capability metadata;
   - versioned template manifest contract;
   - forward-only template migration policy that preserves unknown config keys;
   - replaceable demo-content policy that forbids customer data;
   - the existing storefront navigation manifest consumes the shared foundation.

3. **Production cron deployment hardening**
   - `CRON_SECRET` is production-required;
   - production deployment preflight rejects a missing or shorter-than-16-character cron secret;
   - the secret remains server-only.

## Explicit non-scope

- no drag-and-drop editor, live canvas or inline storefront editor;
- no Page Schema/Templates runtime implementation;
- no storefront template pack implementation;
- no database migration;
- no K&H/payment lifecycle change;
- no automatic production activation.

## Tracked future launch requirements

The 42-template launch decision still requires the later Product Discovery/Guided Finder/Composer/Configurator/Compatibility/Compare/Profile-Context engine family. This gate does not claim those engines are implemented; it prevents the Builder/Page Schema layer from being built on incompatible hard-coded foundations.

## Acceptance

- focused regression tests for the foundation and integration setup contract;
- existing test suite, typecheck and production build remain green;
- production merge only after the normal CI/release gates are green;
- the deferred genuine scheduled loyalty `daily:` evidence remains a separate Block 3 acceptance item.
