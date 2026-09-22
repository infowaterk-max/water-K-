# Storefront Runtime Backbone — Wave 0A + 0B + 0C + 0D

## Purpose

This branch implements the Storefront Runtime foundation on top of the already-merged Builder Compatibility Foundation. It remains isolated from production/shared-staging state while the customer-baseline release line is still owned by open PR #115.

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
   - `layout.section`, `layout.container`, `layout.grid`, `layout.stack`;
   - `content.heading`, `content.text`, `content.image`, `content.button`.

2. **Common registry-driven renderers**
   - every primitive resolves by component key + version;
   - no template-name renderer branches;
   - the existing 12-column responsive contract is used;
   - presentation settings are guardrailed enums/tokens rather than arbitrary executable styling;
   - unsafe button/image protocols degrade safely.

3. **Protected Header / Navigation foundation**
   - `system.header` and `system.navigation` are protected systems;
   - header children are constrained to the approved navigation slot;
   - brand/navigation values arrive through declared binding slots;
   - rendered protected-system markers are retained for later Builder governance.

4. **Neutral reference package**
   - `reference.neutral` is a non-commercial test/reference template package;
   - one Page Schema renders desktop/tablet/mobile;
   - brand name and navigation are resolved by the binding layer;
   - responsive grid spans reflow without a separate mobile page;
   - it is deliberately not attached to a live storefront route.

5. **Regression coverage**
   - primitive registry and protected-system contracts;
   - neutral template registration and Page Schema validation;
   - server rendering through the registry-driven runtime;
   - desktop/mobile responsive evidence;
   - protected header child rejection;
   - unsafe CTA protocol sanitization.

## Implemented in Wave 0D

1. **Versioned template install/switch planning**
   - install, switch, upgrade and refresh modes are explicit;
   - incoming package versions remain part of the Page Schema identity;
   - only page types materialized by the incoming package influence switch-mode detection;
   - unrelated existing page heads remain untouched.

2. **Page preset materialization**
   - template preset pages are cloned into stable tenant page identities;
   - existing page keys are reused by page type;
   - optimistic expected draft revisions are carried into persistence;
   - source template packages are never mutated by materialization.

3. **Template Capability Gate**
   - package registry validation fails closed;
   - Page Schema version must be supported;
   - minimum plan and required feature checks are enforced;
   - every declared page type requires a preset;
   - every materialized page is validated against the component registry and runtime capability context;
   - demo namespace/fixture identities are validated.

4. **Demo-content namespace lifecycle**
   - fixtures receive deterministic namespaced identities;
   - explicit adoption changes fixture state to merchant-owned/adopted;
   - adopted target records are excluded from refresh/install replacement;
   - stale fixture namespaces are planned as retired;
   - adopted records are preserved across retirement;
   - duplicate current demo identities fail closed.

5. **Atomic multi-page draft materialization**
   - `save_storefront_template_drafts_v1` delegates every page to the authoritative single-page draft RPC inside one PostgreSQL transaction;
   - any later page failure rolls the whole template operation back;
   - duplicate page keys/types are rejected;
   - the server helper hashes every materialized Page Schema before the RPC call.

6. **Install/switch idempotency**
   - a parent operation key represents the complete multi-page operation;
   - same-instance replays are serialized by a transaction advisory lock;
   - template key/version/page count and ordered Page Schema document hashes are checked before replay;
   - changed/reordered payload under the same operation key fails with `STOREFRONT_TEMPLATE_OPERATION_KEY_CONFLICT`;
   - per-page operation keys are deterministic children of the parent operation;
   - one explicit template-level audit record represents the logical operation.

7. **Commerce/customer/catalog mutation boundary**
   - the installation plan declares `storefrontPageDrafts=true` and business/customer/order/catalog/B2B mutation capabilities as false;
   - the server template persistence helper performs only the template draft RPC and no table access;
   - regression tests reject direct template-migration DML against product, variant, collection, order, customer/profile and B2B ownership tables;
   - template install/switch therefore changes presentation Page Schema drafts plus required lifecycle/audit evidence, not merchant commerce records.

8. **Regression coverage**
   - deterministic install planning and stable page identity;
   - switch/upgrade/refresh boundary behavior;
   - untouched unrelated pages;
   - plan/feature/component capability gate failures;
   - demo namespace, adoption and retirement behavior;
   - atomic RPC delegation, service-role boundary and DB-level authority check;
   - concurrent parent-operation serialization and replay fingerprint checks;
   - explicit no-business-table-DML evidence.

## Database rollout status

The runtime migrations remain **code-only** on this branch:

- `supabase/migrations/20260908070700_storefront_runtime_persistence.sql`
- `supabase/migrations/20260908090900_storefront_template_installation.sql`

Neither migration is applied to shared staging or production.

PR #115 (Block 7 / customer B2B account ownership) is still open and Draft and owns the next ordered Fresh Install customer-baseline sequence. Therefore this runtime PR deliberately does not edit `supabase/customer-baseline/` yet and does not claim Fresh Install readiness. After PR #115 is merged, both Wave 0B and Wave 0D migrations must be reconciled into the then-current ordered customer baseline and receive genuine Fresh Install proof before runtime merge/readiness can advance.

## CI evidence

The last fully green pre-Wave-0D runtime baseline was GitHub CI #1784. Wave 0D adds focused install/switch, capability, demo-lifecycle, idempotency and business-data-boundary regression contracts. Wave 0 is considered implementation-complete only when the current Wave 0D branch head passes the complete CI workflow; the final current-head CI run is recorded on PR #117.

Fresh Install proof remains intentionally skipped while PR #115 owns the next customer-baseline migration order.

## Explicit non-scope through Wave 0D

- no production or shared staging migration;
- no customer-baseline readiness claim yet for the new runtime schema;
- no Visual Builder UI / drag-and-drop;
- no merchant-facing publish UI;
- no live storefront route switched to the runtime;
- no Monarche/template pack implementation yet;
- no Product Discovery/Finder/Composer/Configurator/Compatibility engine;
- no checkout/payment/K&H/inventory changes;
- no production deployment or tenant-status change.

## Next implementation wave

After Wave 0 current-head CI is fully green and the runtime implementation block is declared closed, the next implementation block is:

**Implementation Wave 1 — Golden #1 Monarche / Core Commerce**

Wave 1 must consume the common runtime/template contracts rather than introducing template-specific runtime branches.

## Safety

The branch does not mutate `main`, production Vercel, production Supabase, shared staging or the Water-K tenant status. The Wave 0B and Wave 0D migration files are source code only until customer-baseline reconciliation and genuine Fresh Install proof are available.
