# Storefront Runtime Backbone — Wave 0A + 0B + 0C

## Purpose

This branch starts the real Storefront Runtime implementation on top of the already-merged Builder Compatibility Foundation. It remains isolated from production/staging state while other roadmap branches are active.

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
   - immutable preview/published in-memory snapshot contract.

## Implemented in Wave 0B

1. **Tenant-scoped persistence model**
   - `storefront_pages` keeps mutable page-head pointers only;
   - `storefront_page_revisions` stores immutable draft/published Page Schema snapshots;
   - revision numbers are monotonic inside one page;
   - composite tenant foreign keys prevent cross-instance/page references.

2. **Optimistic draft save**
   - every save creates a new immutable draft revision;
   - caller supplies the expected current draft revision;
   - stale writers fail with `STOREFRONT_DRAFT_STALE`;
   - operation keys make successful mutation replay idempotent and conflicting reuse fail closed.

3. **Atomic publish**
   - publish locks the tenant/page head;
   - verifies the exact expected draft revision;
   - copies that immutable draft into a new immutable published revision;
   - advances only the published head pointer;
   - writes lifecycle + `admin_audit_log` evidence in the same transaction.

4. **Monotonic rollback**
   - historical published rows are never rewritten;
   - rollback copies a selected historical published revision into a new published revision;
   - current published revision is optimistic-concurrency guarded;
   - rollback source/current/target evidence is retained.

5. **Preview capability sessions**
   - preview is bound to one immutable draft revision;
   - only SHA-256 token hashes are persisted;
   - plaintext preview tokens exist only in the server response that creates them;
   - TTL is bounded to 24 hours;
   - preview sessions are revocable but not deletable/re-targetable.

6. **Server-only mutation boundary**
   - all four persistence tables have RLS enabled;
   - `anon`/`authenticated` get no direct table access;
   - `service_role` receives read access only, not direct DML;
   - mutation RPCs are service-role only;
   - mutation RPCs independently re-check owner/admin/platform authority through `can_manage_storefront`.

7. **Page document integrity evidence**
   - persisted document identity must match page key/type/template/schema metadata;
   - page JSON is bounded to 2 MiB;
   - the server stores a deterministic canonical SHA-256 value with each immutable revision.

8. **Server persistence API**
   - current-store draft save/publish/rollback helpers;
   - current-store preview create/revoke helpers;
   - server-side preview token resolution;
   - server-side published-page resolution;
   - current-store draft/published head read model.

9. **Regression contracts**
   - tenant composite FKs and RLS boundary;
   - immutable revision/event history;
   - preview identity/revocation restrictions;
   - optimistic concurrency/idempotency;
   - service-role-only RPCs + DB-level RBAC check;
   - monotonic rollback semantics;
   - token hashing/expiry and Page Schema identity/hash evidence.

## Implemented in Wave 0C

1. **Shared primitive component contracts**
   - `layout.section`;
   - `layout.container`;
   - `layout.grid`;
   - `layout.stack`;
   - `content.heading`;
   - `content.text`;
   - `content.image`;
   - `content.button`.

2. **Common registry-driven renderers**
   - every primitive is resolved only by component key + version;
   - no template-name branches are introduced;
   - layout uses the existing 12-column responsive contract;
   - spacing, tones, width and radius are guardrailed values rather than arbitrary executable styling;
   - unsafe button/image protocols fail to a safe presentation.

3. **Protected Header / Navigation foundation**
   - `system.header` and `system.navigation` are registered as protected systems;
   - header children are constrained to the approved navigation slot;
   - brand/navigation data can arrive only through declared binding slots;
   - protected-system markers survive into rendered output for later Builder governance.

4. **Neutral reference package**
   - `reference.neutral` is a deliberately non-commercial template package;
   - the same Page Schema renders desktop/tablet/mobile;
   - brand name and primary navigation are bound through the runtime binding layer;
   - mobile grid spans reflow without a second mobile page definition;
   - the package is test/reference-only and is not attached to a live storefront route.

5. **Primitive regression coverage**
   - registry contracts and protected-system metadata;
   - neutral template registration and Page Schema validation;
   - server rendering through the runtime;
   - desktop/mobile responsive grid evidence;
   - protected header child rejection;
   - unsafe CTA protocol sanitization.

## Wave 0B database rollout status

The migration is committed as `20260908070700_storefront_runtime_persistence.sql`, but is **not applied to shared staging or production** on this branch.

The current production baseline still has one reviewed customer-baseline migration. Open PR #115 (Block 7) owns the next Fresh Install forward-migration sequence on its branch. To avoid competing `0002/0003` baseline numbering and a false Fresh Install claim, Wave 0B deliberately does not edit `supabase/customer-baseline/` yet. Before this runtime PR can become merge-ready, it must be rebased after the active baseline owner lands (or otherwise reconciled), then the Storefront Runtime migration must be added to the ordered customer-baseline forward-migration manifest and receive genuine Fresh Install proof.

## Explicit non-scope through Wave 0C

- no production or shared staging migration;
- no customer-baseline readiness claim yet for the new schema;
- no Visual Builder UI;
- no drag-and-drop editor;
- no merchant-facing publish UI;
- no live storefront route switched to the new renderer;
- no Monarche template package yet;
- no Product Discovery/Finder/Composer/Configurator/Compatibility implementation;
- no change to checkout, payment, K&H, inventory or production tenant status;
- no automatic production activation.

## Next Wave 0 increment

### Wave 0D — template install/switch foundation

- versioned template package installation;
- page-preset materialization;
- template switch without business-data mutation;
- demo-content namespace lifecycle;
- Template Capability Gate;
- regression evidence that template switching changes presentation documents only and preserves commerce/customer/order data boundaries.

## Safety

The branch was created from production `main` and does not mutate `main`, production Vercel, production Supabase or shared staging. Wave 0B contains a migration file as code only; no database target has been changed by this work. Wave 0C is code/test-only and does not switch any live route to the new runtime.
