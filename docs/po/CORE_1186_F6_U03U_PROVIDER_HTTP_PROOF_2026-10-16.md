# Shoperation Core #1186 — F6-U03u provider Auth and PostgREST GET-only proof

2026-10-16. Direct predecessor: DRAFT PR #1404 at exact HEAD 69dba425893a5854a074c956524b8135c983f7c7. Keep stacked DRAFT, no merge.

## Truth boundary

F6-U03n/o/p proved original SQL and RLS against local PostgreSQL17 synthetic JWT/role fixtures. It has not proven actual Supabase-issued JWTs or HTTP gateway behaviour. Fresh Install istjjkdcvsvilrycqecd is active on PG17.6 but has 0 Auth users, missing Office 0048 participants and 0 managed migration ledger rows. Therefore real provider positive proof is currently unavailable, and live Office migrations are forbidden.

## Implemented runnable proof harness

Source: scripts/shoperation-f6-u03u-provider-http-proof.mjs.
- Single hard-pinned HTTPS project istjjkdcvsvilrycqecd.supabase.co; only HTTP GET, never Auth password sign-in or other POST, no database DML/DDL.
- Requires three DISTINCT, pre-existing owner-controlled user tokens: Alap, Pro, and a revoked-role actor; fixture also requires two distinct store UUIDs and four distinct Office thread IDs. All tokens and fixture values remain outside GitHub/CI and are never logged.
- Checks structure of JWT issuer, role, subject, expiry and algorithm, explicitly refusing to mistake decoding for signature verification. Then checks live GET /auth/v1/user from same provider project for every user ID.
- Performs eleven exact-identifier GET /rest/v1/office_threads calls. Three positive customer/internal own-tenant rows, eight Alap internal/foreign, Pro foreign, revoked and anonymous empty-set denials. A 403, 404 or redirect is not a valid RLS denial result: every negative must be HTTP 200 with an empty array. Any unexpected user ID, wrong tenant row, extra row or missing expected positive row fails closed.
- The unit-test transport is intentionally injectable but reports providerSignedJwtProven:false, because mocked responses cannot prove signature verification or provider network authority.
- CLI --preflight is fully offline and always returns blocked state. Live-only CLI --live-readonly requires the exact explicit approval env SHOPERATION_F6U03U_LIVE_READONLY_APPROVAL=APPROVED_OWNER_PROVIDED_EXISTING_FIXTURES and separately supplied SHOPERATION_F6U03U_FIXTURE_PATH, SHOPERATION_F6U03U_PUBLISHABLE_KEY plus SHOPERATION_F6U03U_ALAP_TOKEN, SHOPERATION_F6U03U_PRO_TOKEN, SHOPERATION_F6U03U_REVOKED_TOKEN. The live runner cannot be transport-mocked via public CLI flags. No live environment configured by the workflow.

## Coverage and outstanding blockers

Offline positive/negative tests exercise proper requests, identity verification, role isolation, unexpected row leakage, forged issuer, expired token, service_role, redirect/403 and missing explicit approval. These tests validate source behaviour only.

Even if separately approved real GET evidence is obtained later, it does NOT reconcile the empty hosted 0046 migration ledger, establish private-key custody or full Supabase Auth/Storage/PITR recovery, nor authorize the forward 31 Office migrations. The revoked role must be externally established before the read-only check; this script never changes role bindings.

**Critical evidence limit:** HTTP 200 with an empty array can also arise if a fixture row does not exist. Therefore the live read-only matrix may attest observable Auth identity and HTTP allow/empty behaviour only. It always records managedPostgrestReadOnlyRlsProven:false, fixtureExistenceIndependentlyProven:false and revokedRoleStateIndependentlyProven:false until independently sourced presence and revoked-binding proofs can be established. Never promote these to full managed RLS acceptance.

No hosted writes, no staging activation, no new paid project and no automatic template or Builder work. Issues #1186 and #1228 stay open until the entire capability closure chain passes.
