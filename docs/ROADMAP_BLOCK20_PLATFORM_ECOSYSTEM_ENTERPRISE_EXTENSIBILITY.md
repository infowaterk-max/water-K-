# Roadmap Block 20 – Platform Ecosystem & Enterprise Extensibility

## Canonical reconstruction

Block 20 is the platformization layer immediately after Block 19 Predictive Optimization & Autonomous Commerce Guardrails and immediately before Block 21 Page Schema / Templates and Block 22 Visual Builder. Repository history names the block **Platform Ecosystem & Enterprise Extensibility**. Block 19 explicitly deferred the general plugin/app ecosystem here; Block 11 deliberately kept `apiAccess` reserved until a later explicit release.

Block 20 therefore exposes existing Shoperation authorities to governed external extensions. It does **not** create a second catalog, pricing, inventory, order, customer, workflow, approval, provider or automation authority.

## Required scope

1. Platform-controlled extension app catalog with explicit release lifecycle and allowlisted API scopes.
2. Tenant-scoped extension installation lifecycle (`enabled`, `disabled`, `revoked`).
3. Explicit Block 20 release of the previously reserved Pro `apiAccess` capability through the existing Block 11 entitlement authority.
4. Revocable, expiring API credentials. Plaintext credentials are shown once and never persisted; only SHA-256 hashes and non-secret prefixes are stored.
5. Scope-limited public API surface. The initial contract is intentionally narrow:
   - `catalog.read` – tenant-scoped catalog read only;
   - `automation.events.write` – normalized Block 17 event ingress only.
6. No caller-supplied tenant authority. Tenant identity is derived from the authenticated extension credential.
7. Block 17 normalized event subscriptions for outbound webhooks. Fanout is driven from canonical `automation_processing_runs` event evidence; extensions do not create a second event bus.
8. Idempotent delivery evidence keyed by subscription + Block 17 run key.
9. Bounded retry/backoff and dead-letter after five failed deliveries, processed by the existing single protected `/api/cron/integrations` schedule.
10. Webhook delivery respects the existing tenant automation pause/circuit-breaker control plane.
11. Tenant lifecycle mutations and platform catalog mutations are privileged, RBAC/entitlement gated and appended to the existing admin audit chain.
12. Webhook endpoints are HTTPS-only and reject credentials, non-standard ports, localhost and directly-addressed private/link-local networks. Redirects are disabled during delivery.

## Existing authorities reused

- Block 11 `entitlement_capabilities`, `plan_capability_grants`, `feature_entitlements` and deterministic entitlement resolver;
- existing store RBAC (`integrations.manage`) and current-store scope;
- `advancedIntegrations` for merchant ecosystem administration;
- `apiAccess` for external API credentials/webhook management;
- Block 17 `automation_processing_runs` event identity/evidence and normalized event allowlist;
- Block 17 automation pause/circuit-breaker and the existing integrations cron;
- existing domain tables for read-only catalog projection;
- existing `dispatchEventDrivenWorkflow` authority for external event ingress;
- existing `admin_audit_log` evidence chain.

An extension receives no direct database credentials, no generic SQL/RPC endpoint and no generic business-state mutation endpoint.

## API authority boundary

`GET /api/platform/v1/catalog/products` is read-only and constrained by the instance derived from the credential.

`POST /api/platform/v1/events` accepts only Block 17 canonical event types. It additionally requires the tenant's existing `automation` entitlement and delegates to `dispatchEventDrivenWorkflow`. High-risk commercial events therefore still rely on the existing `action_proposals` approval authority and Block 17 retry/dead-letter semantics.

Future extension endpoints must delegate to an existing domain authority. Adding a generic database proxy is prohibited by this contract.

## Credential and lifecycle fail-closed rules

An external request is authorized only when all of these remain true at request time:

- token format and constant-time hash verification succeed;
- credential is not revoked or expired;
- requested scope is present on the credential;
- installation belongs to the same tenant and is `enabled`;
- app is currently `released` and allows the requested scope;
- effective tenant `apiAccess` entitlement is enabled;
- optional existing security rate limiter permits the request when configured.

Disabling an installation stops new requests. Revoking an installation also revokes its active API credentials and disables its webhook subscriptions. No configuration row is silently moved across tenants.

## Webhook lifecycle

Outbound webhooks are evidence/notification only. They never act as a commerce authority. The private database trigger observes Block 17 processing evidence with `authority='event-driven-workflow'`, selects only enabled same-tenant subscriptions/installations/released apps, and inserts an idempotent delivery row. The trigger is `SECURITY DEFINER` in the non-exposed `private` schema and has all direct execution revoked from `PUBLIC`, `anon`, `authenticated` and `service_role`.

The existing integrations cron processes due deliveries. A delivery is claimed optimistically, signed with a per-subscription HMAC secret derived from a server-only master secret, sent without redirects, and marked delivered/retry/dead-letter. Five failures are terminal. Tenant automation pause/circuit-open state suppresses delivery attempts without losing the queued evidence.

## Explicit non-scope

Block 20 does **not** implement:

- Block 21 Page Schema / Templates;
- Block 22 Visual Builder;
- storefront/template redesign or visual editing;
- a plugin-controlled SQL console or generic RPC proxy;
- direct extension writes to products, variants, prices, inventory, promotions, orders or customers;
- a second workflow engine, event bus, cron schedule, retry authority or approval authority;
- subscription commerce;
- supplier feed/API sync, marketplace bulk publishing or advanced PIM/ERP domain behavior themselves;
- automatic activation of an app, API key or webhook for Water-K.

Those domain integrations may later use the Block 20 boundary, but their business behavior remains outside this block unless separately roadmapped.

## Database / customer baseline

Block 20 adds customer forward migration `0013_block20_platform_ecosystem.sql` and production migration `20260911074000_block20_platform_ecosystem.sql`. The migration creates the extension catalog/install/credential/webhook evidence contract and releases Pro `apiAccess` through the existing entitlement model.

The customer manifest must remain `snapshot-reviewed`, `freshInstallProofRequired=true`, `proofContractSha256=null` until a **genuine empty-target Fresh Install proof for ordered baseline 0001–0013** succeeds. No previous proof may be relabeled as evidence for this baseline.

## Acceptance / release contract

Before merge:

- Block 20 unit/contract/regression tests green;
- tenant-isolation, RBAC/entitlement, credential hashing/revocation, idempotency and failure-path evidence green;
- TypeScript and production build green;
- customer baseline guard green while correctly remaining `snapshot-reviewed` until proof;
- staging migration + non-Water-K staging acceptance green;
- Supabase security advisors reviewed after DDL;
- Vercel preview READY;
- PR mergeable against the then-current `main` and integration CI green;
- genuine empty-target Fresh Install proof for 0001–0013 green before release authorization.

After merge/release:

- production migration succeeds only after all pre-release gates;
- production Vercel READY and `/api/health` returns 200 / `status=ok` / `database=ok` on the merged version;
- production Supabase remains healthy;
- Water-K remains `pilot` / `pro`, product=1, variants=3, orders=8, onboarding batches=0;
- Water-K receives no extension installation, credential, subscription, delivery or Block 19 autonomy state as a release side effect;
- post-release runtime/security checks remain green.
