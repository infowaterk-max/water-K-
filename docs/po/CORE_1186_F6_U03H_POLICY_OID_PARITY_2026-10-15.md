# Shoperation Core #1186 — F6-U03h RLS policy role-OID provenance and portability

**2026-10-15 | Draft PR #1347 | source-only local PostgreSQL17 diagnostic.** Dependency #1347 → #1335 → #1332 → #1323 → #1322 → #1321 → #1319 → #1317 → #1308 → #1304. No out-of-order merge.

## Known problem and independently observed reference

The original 47 historical SQL files execute in isolated real PostgreSQL17 with the same **126 RLS policies** and 4,621 catalog definitions as Fresh Install. The six non-policy object-kind fingerprints match. The raw policy MD5 differs: local fb55c5ca1e64d6607b15e148c0c9e64e, Fresh Install 63aa91ed618266d7abcf716835436704. The canonical policy serialization uses p.polroles::text, which contains database-local PostgreSQL role OIDs.

Fresh Install project istjjkdcvsvilrycqecd, read-only observation 2026-10-15: anon oid 16484 (2 policies), authenticated oid 16485 (124 policies); 126 original policies re-expressed with sorted role names produce MD5 e5dc03a08c272c6b993b45306c5f664d. No hosted SQL altered.

## Bounded implementation

- scripts/shoperation-f6-u03h-policy-role-parity.mjs imports the *unchanged* canonical source from compileCatalogQueries, creates two read-only SELECT queries (raw and named-role) and role/OID counts. Named-role comparison substitutes only p.polroles::text with deterministic pg_roles names; never modifies application RLS or canonical transaction guard.
- tests/shoperation-f6-u03h-policy-role-parity.test.ts protects source, names/counts/digests, false replay attestation, real DB binding limitations and abort-before-DROP.
- Existing .github/workflows/f6-u03g-catalog-drift-proof.yml is extended to also run on the F6-U03h branch; the original 47-file and 4621-object proof still runs first, then computes policy raw/named digest and role IDs on Docker postgres:17.
- Result classifies role OID serialization versus continued definition drift, with explicit full hosted readiness = false.

## Strict non-authorization

The F6-U03f guard remains unchanged, including its original raw fingerprint; F6-U03b 59-file compiler continues raising FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED before either DROP SCHEMA. No hosted SQL write, Supabase creation/pause/start, provider event manipulation, credential transport or schema reset is performed. Platform waterk-platform stays active and untouched; waterk-staging remains paused; Fresh Install remains intact.

Still BLOCKED: actual full managed-provider F6-U03f positive guard and TLS target binding; local **59-file** atomic replay and rollback/restore proof; authenticated tenant-isolated Alap/Pro Office RLS; hosted postflight. Core #1186 remains OPEN.

Only evidence bound to exact HEAD with canonical Development Guard, Plan Before Code, Quality Tests, TypeScript, Production Build, Completion Truth, Lifecycle and real PostgreSQL17 can close this scoped diagnostic; even then it cannot authorize the hosted 59-file deployment.
