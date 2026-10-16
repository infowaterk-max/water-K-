# Core #1186 F6-U03o – source-authentic native anonymous and foreign helper denial

**2026-10-16 · [DRAFT #1367](https://github.com/infowaterk-max/water-K-/pull/1367) · Stacked on #1364 · Owner #1228**

## Why this scope

F6-U03n independently verified real original 59 reviewed baseline + 19 original Office SQL on a one-shot Docker PostgreSQL17 instance, plus A Alap and B Pro original-schema customer/private Office threads, messages and tasks. Unfiltered authenticated native row access was correct for both owners and denied to an unrelated user. That does **not** check whether `anon` can read tables or whether browser-executable private SECURITY DEFINER helper functions can leak cross-store knowledge using chosen UUID arguments.

F6-U03o **adds only read-only PostgreSQL role probes** on the same independently replayed, untouched source SQL and F6-U03n synthetic tenant fixture, keeping every original migration, RLS policy and grant unchanged. No new tables, staff impersonation, hosted SQL or release authority.

## Native anonymous execution

Inside a transaction with `SET LOCAL ROLE anon`, validate `current_user='anon'`, `rolbypassrls=false` and `auth.uid() IS NULL` (the shim is **local-only**). Actually attempt **unfiltered** `SELECT count(*)` on `office_threads`, `office_messages`, and `office_tasks` using a security-invoker anonymous `DO` block, not a filtered application query. A native SQLSTATE 42501 permission denial or exactly **0** visible rows is a safe outcome; any positive count, wrong role or unexpected SQL error is a failure. The catalog can deny SELECT entirely, which is a stronger object-level block than zero-row RLS; log those distinct outcomes honestly.

## Native direct private helper execution

Use separate `BEGIN; SET LOCAL ROLE authenticated` and transaction-local synthetic JWT `request.jwt.claim.sub` for each case, execute three **source-declared two-UUID signatures**:

- `private.current_user_can_read_office_thread_v1(instance_id,thread_id)` – current-user *participation*, not the full plan gate
- `private.office_thread_plan_allowed_v2(instance_id,thread_id)` – full plan+thread guard
- `private.office_task_plan_allowed_v2(instance_id,thread_id)` – linked task guard (delegates to thread guard)

Positive results must include A/Alap **customer**, B/Pro **customer**, B/Pro **internal_private**. Negative results must include owner A → B populated customer; owner B → A populated customer; mixed A instance+B thread; unknown current user → A and B; and **A/Alap internal_private denied by the plan-scoped functions despite a deliberately stale manual teamChat entitlement**. The plain participant helper is not required to deny its own member for an Alap internal thread, since it is *not* the plan authority; conflating those contracts is a false security finding.

All booleans/identities are read from actual PostgreSQL catalog/runtime roles with `ON_ERROR_STOP=1`, strict exact-case counts, mandatory positive controls and fail-closed negative tests. Results are scope-labeled `LOCAL_PG17_ANON_FOREIGN_HELPER_DENIAL_VERIFIED_NOT_SIGNED_JWT`, never full release.

## Explicit blockers

Native role claims come from an explicitly **synthetic** local Docker `auth.uid()` shim. Real signed Supabase JWT signature, expiration/revocation, hosted Auth, Data API exposed schemas, Storage policies, other support/participant cases and the full 78-source immutable deployment review are **not** proven. The hosted Fresh Install reset is not approved. The original F6-U03b abort-before-DROP remains unchanged and no Supabase resource is modified. DRAFT PR, #1186/#1228 OPEN, main untouched.

**Completion:** critical Plan Before Code, real Docker17 role/SQL evidence and its artifact, malicious/negative unit tests, normal exact-head CI/TypeScript/build/Security/Completion Truth/Lifecycle for this bounded local-only diagnostic. CI passes MUST NOT be conflated with hosted readiness.
