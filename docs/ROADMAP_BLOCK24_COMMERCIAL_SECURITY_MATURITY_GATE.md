# Roadmap Block 24 – Commercial / Security / Maturity Gate

Status: implementation in progress

## Canonical reconstruction

Block 24 is the final commercial/security/maturity gate after Block 23 AI-Assisted Builder / Template Generation. It is not a new feature-expansion block. Block 23 explicitly deferred commercial packaging, paid AI quotas/credits, final monetization, broad maturity certification and launch-commercial policy here. The pre-existing Market Ready 1.0 contract supplies the launch-readiness acceptance boundary.

Block 24 therefore closes three axes only:

1. **Commercial packaging / monetization** over the existing Block 11 Alap / Pro / Add-on entitlement authority.
2. **Security hardening / launch security gates** without weakening the existing fail-closed database and tenant boundaries.
3. **Maturity / release-readiness certification** using the existing V24 rollout evidence and GO/NO-GO authority rather than creating a parallel release system.

No new Block 1–23 product feature is pulled forward by this block.

## Commercial policy

The canonical package model remains unchanged:

- `alap` is the full professional base package;
- `pro` is the advanced growth/automation/decision-support package;
- separately activated Add-ons remain separate entitlements and are never implicit Pro inheritance;
- variable-cost AI remains the existing `ai-assistant` Add-on and is not silently bundled into Alap or Pro.

No previously accepted final HUF price or fixed storefront-generation credit count exists in repository/history evidence. Block 24 therefore must not invent a price point or quota number. Instead it makes the monetization boundary executable:

- AI storefront generation requires the effective existing `addon:ai-assistant` entitlement;
- commercial credit allowance is server configuration (`SHOPERATION_AI_STOREFRONT_CREDITS_PER_30D`), not caller input;
- missing/invalid allowance fails closed;
- one AI storefront generation attempt consumes one commercial credit through the existing server-side `consume_security_rate_limit` metering primitive;
- the commercial meter is tenant-scoped and separate from the existing per-user abuse/security limiter;
- the commercial policy can never grant an entitlement and can never bypass template, Page Schema, RBAC or tenant authority.

Actual sales price remains an external commercial value until an explicit accepted price exists; code must not synthesize one.

## Security gate

### Storefront trigger privilege hardening

Production Security Advisor identifies direct `anon` / `authenticated` execution on three trigger-only `SECURITY DEFINER` functions created by the canonical storefront persistence layer:

- `public.storefront_revisions_immutable()`;
- `public.storefront_events_immutable()`;
- `public.storefront_preview_session_guard()`.

These are trigger helpers, not application RPCs. Their final privilege contract is direct EXECUTE denied to `PUBLIC`, `anon`, `authenticated` and `service_role`; PostgreSQL trigger invocation remains the only supported execution path.

This follows the already accepted trigger-only privilege-hardening precedent. The intentionally service-only `RLS enabled / no policy` inventory remains fail-closed and must not receive permissive policies merely to silence Advisor INFO findings.

### Leaked-password launch gate

The existing post-release security decision remains canonical: leaked-password protection is a launch-blocking gate when password-authenticated customer onboarding is enabled. The current application exposes password signup, password reset and password change flows, so public password-auth launch requires all of the following before Market Ready GO:

1. production Supabase plan supports leaked-password protection;
2. leaked-password protection is enabled in Auth settings;
3. Security Advisor no longer reports `auth_leaked_password_protection`;
4. negative signup/change acceptance rejects a known-compromised test password without weakening existing password requirements.

This is an external Supabase Auth/billing control, not a database migration and not something commercial configuration may bypass.

## Maturity / Market Ready certification

Block 24 reuses the existing SHA-bound rollout evidence/control plane (`rollout_environments`, `rollout_checks`, `rollout_decisions`, `record_rollout_check`, evidence-bundle-bound GO/NO-GO). It must not create another release-governance authority.

A Block 24 release candidate is GO only when evidence for the exact candidate SHA proves:

- Alap / Pro / Add-on server-side entitlement boundaries;
- AI Add-on and commercial credit fail-closed behavior;
- targeted tests, full regression, TypeScript, production build and security audit;
- provider-neutral / non-Water-K staging acceptance;
- tenant isolation, authorization, entitlement, spoof/malformed input rejection and relevant idempotency/concurrency checks;
- critical checkout/payment/order/e-mail/inventory/returns regression remains green;
- customer baseline and Fresh Install proof are current for the candidate schema;
- Supabase Security Advisor has no Block 24-caused regression and the leaked-password launch gate is closed for public password-auth launch;
- Water-K business/storefront invariants are unchanged;
- Vercel preview is READY and the PR is mergeable at the exact expected head;
- production release/rollback evidence is bound to the merged SHA.

## Database / Fresh Install impact

Commercial policy reuses existing entitlement and rate-limit authorities and adds no commercial schema.

The storefront trigger privilege lockdown is a genuine sellable-schema security change, so Block 24 adds one forward migration. Customer baseline therefore advances from ordered `0001–0017` to `0001–0018` using a byte-identical customer migration and returns to `snapshot-reviewed` / `freshInstallProofRequired=true` until a genuine empty-target proof succeeds. Only after that proof may the manifest return to `ready` / `freshInstallProofRequired=false` with the new proof contract hash recorded.

## Explicit non-scope

Block 24 does not:

- create a third package tier;
- invent HUF pricing or unapproved numeric commercial values;
- create a second entitlement, billing, storefront, Builder, AI, extension, release or governance authority;
- add arbitrary AI code generation, autonomous publishing or commerce-state mutation;
- add permissive RLS policies to intentionally service-only tables;
- change Water-K plan/status/data or activate an AI Add-on as a release side effect;
- merge or rewrite the parallel stacked Storefront Wave branches.
