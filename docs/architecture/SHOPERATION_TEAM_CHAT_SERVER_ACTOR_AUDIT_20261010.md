# F26 – Team Chat server actor and tenant authority audit (2026-10-10)

**Scope:** Source inspection and dynamic mocked Next.js handler behavior, not an authorization change or production-readiness declaration. Canonical Product Owner / capability authority remains the Living Roadmap v2; accepted Alap simple B2B/RFQ and strictly Pro-only Team Chat are unchanged. This document is an evidence record, not a second product authority.

## Examined privileged surfaces

| Entry point | Authentication/authorization chain | SQL actor and tenant provenance |
| --- | --- | --- |
| `src/app/api/admin/office/chat/message/route.ts` POST | `getAdminRequestUser()`, `hasCurrentPlanFeature('teamChat')`, `requireCurrentStoreContext()`, `hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',...)`, strict Zod validation | `admin_mutate_office_team_chat_v2`: `p_actor: actor.id`, `p_instance_id: scope.instanceId`; no JSON actor/instance parameters forwarded |
| `src/app/admin/kommunikacio/chat/actions.ts` | `privateChatAccess()` derives `userId` from `getAdminRequestUser()`, enforces `teamChat` plan, store context and `office.internal_chat` | Both Team Chat v2 mutator and `admin_transfer_office_thread_owner_v1` use `p_actor: userId`, `p_instance_id: instanceId`; only target/thread from FormData |
| `src/app/admin/kommunikacio/iroda/actions.ts` | Separate `privateChatAccess()` derives `userId` from `getAdminRequestUser()`, `teamChat` plan, store context and `office.internal_chat` | Team Chat v2 mutator and owner transfer receive server-derived actor/instance; target/thread from FormData |

`getAdminRequestUser()` in `src/lib/auth/admin-api.ts` invokes `createClient()` and Supabase `auth.getUser()` to obtain the user, verifies platform operator or scoped store rights (including legacy migration-gated fallback), with optional security rate limit. `requireCurrentStoreContext()` obtains current store context. The server uses the service-role Supabase client only **after** the route's prerequisite checks. Source review found **no direct caller-supplied `p_actor` substitution at these three routes**. This does not exclude future or undiscovered callers.

## F26 executable regression

`tests/team-chat-server-actor-binding.test.ts` uses mocked authentication, current-plan, store-context, capability and database adapters to call the real exported Next.js `POST` function. Cases include:
- Caller sends conflicting `actorId`, `userId`, `p_actor`, `instanceId`, `p_instance_id` in JSON; the observed service-role RPC arguments still derive strictly from authenticated server actor and selected store.
- Deny unauthenticated user, non-Pro Team Chat plan, missing active store, missing `office.internal_chat` permission **before service-role RPC**.
- Deny invalid UUID, empty message, duplicate mention and incomplete business-object association **before database writes**.
- Do not claim success for RPC private-thread authorization error or mismatched/missing returned message identity.
- Both server-action owner transfer implementations must continue binding actor/instance through `privateChatAccess()` rather than submitted FormData.

This is a route/controller trust-boundary regression. F25 independently exercised real PostgreSQL 18 with two test tenants, role-bound members, actual successful and forbidden owner-transfer RPCs, single owner/audit and full rollback, **69/69 migrations**. Combining these provides stronger but still incomplete end-to-end evidence.

## Still open before Capability Closure

1. **Native Supabase signed-in identity:** `auth.getUser()`/cookie/session/JWT cryptographic claims, expiry/revocation, browser and server authorized role enforcement, and MFA workforce policy must be tested on an authorized **empty disposable** Supabase-compatible target.
2. **Service-role confused-deputy audit:** PostgreSQL SECURITY DEFINER functions trust their caller-supplied `p_actor`. Any other privileged route, worker, Edge Function or RPC gateway able to supply arbitrary actors is an independent risk. Inventory every caller and prove each uses authenticated context, tenant and entitlements.
3. **Pro-only entitlements end to end:** `teamChat` and Office Advanced must be enforced consistently by UI, Server Action, REST, service role, SQL and Pro→Alap downgrade. Metadata-only F24 package decision sync is not entitlement implementation.
4. **Native populated tenancy/traffic:** cross-tenant authorized/unauthorized actor rows, owner transfer concurrency, object read/attachments, notifications and audit correlation need DB/application integration with no occupied-target mutation.
5. **Fresh Install native provider proof:** current `supabase/customer-baseline/manifest.json` is `snapshot-reviewed`, `freshInstallProofRequired=true` and `proofContractSha256=null`; local PostgreSQL fixture is NOT managed Supabase provider/Auth/Storage acceptance.

**Outcome:** F26 may close only *mocked server route actor-argument provenance and fail-closed request gating*. #1186 and #1228 remain **PARTIAL/BLOCKED** until actual capability dependency and native identity tests. No customer SQL, live DB, Vercel Preview, CI/PR or release state changed.

