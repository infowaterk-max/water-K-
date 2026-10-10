# F28 — Office Composer / Communication Hub action-boundary security proof

**Date: 2026-10-10 | Core #1186 U10A2 | Local action mocks, NOT native Supabase/Auth/RLS proof**

## Scope and execution

F28 exercises the actual exported Server Actions under isolated Vitest mocks. The authenticated `getAdminRequestUser('support.manage')` actor is intentionally distinct from forged FormData `actorId`, `p_actor`, `userId`; the tenant comes solely from `requireCurrentStoreContext('support.manage')`, not forged `instanceId` or `p_instance_id`. Pro-only `requirePlanFeature` rejects denied cases before constructing a service-role client or calling an RPC.

The Commerce/Office Composer draft-save, reply autosave, delete, new-email queue, reply queue and advanced Communication Hub mailbox/relationship actions are executed with injected positive responses, null auth, denied plan, missing scope, database refusal, contradictory receipts and delegated `actingForUserId`. Delegation subject is distinct from the authenticated operator and requires SQL-provided matching `actingForUserId` and nonempty `delegationId` when acting on another user. No actual external email was sent.

## Confirmed failure and bounded repair

Before the fix, both dynamic Composer negative receipt tests failed: the old code accepted a persisted `id` different from `draftId`, and a queued `id` different from `messageId`. The existing canonical SQL v3/v4/v5/v6 returns matching IDs; it was independently inspected before changing the application. The bounded repair in `composer-actions.ts` now requires `id===draftId`, requested existing draft identity matches the returned draft, `id===messageId`, reply `threadId` consistency, and delegated operator/subject/delegation receipt consistency. No SQL, auth, plan catalog or entitlement grant was modified.

**Test evidence:** `vitest run tests/office-composer-action-actor-f28.test.ts tests/communication-hub-action-actor-f28.test.ts --maxWorkers=2`: **16/16 PASS**, both executable modules; previously 14/16 PASS with two receipt negatives failing.

## Boundaries / incomplete dependencies

Mocks attest local Server Action provenance and fail-closed receipt validation; they do **not** prove deployed SQL grants, PostgreSQL SECURITY DEFINER callability, actual signed JWT/cookies, native RLS, real delegated-member tenancy, Pro↔Alap downgrade, external email provider, live communication jobs or existing-production migration parity. The #1186 entitlement and #1228 fresh-install dependency closure remain OPEN/PARTIAL and OPEN/BLOCKED, respectively. A separate, disposable native Supabase/Auth/RLS scenario is needed before capability closure; no live/hosted database writes are authorized here.

This note is evidence only and cannot upgrade Capability Closure/Truth or override accepted Product Owner package and infrastructure decisions.
