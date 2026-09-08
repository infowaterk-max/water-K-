# Storefront Runtime Backbone — Wave 0A

## Purpose

This branch starts the real Storefront Runtime implementation on top of the already-merged Builder Compatibility Foundation. It deliberately stays code-only and isolated from production/staging database state while other roadmap branches are active.

## Implemented in Wave 0A

1. **Versioned Page Schema runtime contract**
   - ordered sections and nested component nodes;
   - stable page/node identifiers;
   - component key + component version on every node;
   - config, bindings and responsive overrides;
   - page/template identity.

2. **Component Registry**
   - multiple component versions can coexist;
   - duplicate key/version registration fails closed;
   - binding slots, child policy, page-type and capability checks;
   - protected-system metadata is supported by the definition contract.

3. **Binding Layer**
   - allowlisted storefront namespaces;
   - safe own-property traversal only;
   - prototype-pollution path segments rejected;
   - explicit per-component binding slots;
   - missing data may use an explicit fallback;
   - unknown component config is preserved and reported as a warning rather than destructively stripped.

4. **Responsive resolution**
   - desktop -> tablet -> mobile override inheritance;
   - resolved hidden/grid-span state.

5. **Registry-driven renderer**
   - validates the complete page document before rendering;
   - renderer lookup is key + version based;
   - missing renderer fails closed;
   - resolved bindings and responsive state are passed to reusable component renderers;
   - no template-specific conditional renderer branches.

6. **Template Registry**
   - template manifest/page identity enforcement;
   - page type declaration enforcement;
   - duplicate version protection.

7. **Migration + snapshot contracts**
   - forward-only explicit page-schema migration chain;
   - backward migration forbidden;
   - missing migration step fails closed;
   - immutable preview/published snapshot object contract.

8. **Regression tests**
   - valid page tree + forward-compatible unknown config;
   - duplicate ids / unsafe bindings / capability denial;
   - responsive inheritance;
   - template registry identity;
   - migration rules;
   - immutable snapshots;
   - server-rendered registry-driven component output.

## Explicit non-scope of Wave 0A

- no database tables for page drafts/revisions yet;
- no production or staging migration;
- no Visual Builder UI;
- no drag-and-drop editor;
- no merchant-facing publish UI;
- no live storefront route switched to the new renderer;
- no Monarche template package yet;
- no Product Discovery/Finder/Composer/Configurator/Compatibility implementation;
- no change to checkout, payment, K&H, inventory or production tenant status;
- no automatic production activation.

## Next Wave 0 increments

### Wave 0B — persistence and publish lifecycle

- tenant-scoped page draft/revision storage;
- immutable published revisions;
- preview token/session contract;
- guarded publish transaction;
- rollback to prior published revision;
- audit events;
- RLS/service-role boundaries;
- snapshot/migration persistence evidence.

### Wave 0C — first common storefront primitives

- Section / Container / Grid / Stack;
- Heading / Text / Image / Button;
- shared component manifests and renderers;
- protected Header/Navigation slot integration;
- first neutral reference page rendered through the runtime.

### Wave 0D — template install/switch foundation

- versioned template package installation;
- page-preset materialization;
- template switch without business-data mutation;
- demo-content namespace lifecycle;
- Template Capability Gate.

## Safety

Wave 0A branches from production `main` but does not mutate `main`, production Vercel, production Supabase or shared staging. It can be reviewed and CI-tested independently while the currently open roadmap PRs remain untouched.
