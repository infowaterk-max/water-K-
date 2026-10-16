# Core #1186 F6-U03l – immutable 78-source candidate manifest and native PostgreSQL17 legacy inbound ACL proof

**2026-10-16 · [Draft PR #1358](https://github.com/infowaterk-max/water-K-/pull/1358) · Stacked on #1355 → #1353 → #1350 · Existing owner [#1228](https://github.com/infowaterk-max/water-K-/issues/1228)**

## Why this work is necessary

Prior F6-U03k isolated real PostgreSQL17 runs executed one transaction of **59 approved unchanged customer-baseline migration files + 19 original timestamped Office SQL files**, with authentic target-preflight and postflight, then showed all application schema objects rolled back on a distinct injected pre-COMMIT failure. The original 59-file Fresh Install package remains incomplete. Passing the 78-file local historical source replay does not make it a safe hosted release migration.

One original Office dependency, `20260903180000_inbound_office_email_atomic_v2.sql`, creates the legacy sender-thread matching `record_inbound_office_email_v2(text,text,text,text,text)` security-definer function and temporarily grants `service_role` EXECUTE. The later authentic `20260908030000_digital_office_real_inbound_foundation_v1.sql` changes inbound processing to tenant-mailbox/RFC threading v3 and revokes old v2 execution from `public`, `anon`, `authenticated`, and `service_role`. A text-only REVOKE is not enough: the *final* effective native PostgreSQL role privileges are the additional required assurance.

## Source-only review candidate – NEVER a production executable package

`scripts/shoperation-f6-u03l-release-candidate-acl.mjs` builds versioned machine-readable `shoporation.f6-u03l.ordered-source-review-candidate.v0` / version `v0.1` from the existing canonical F6-U03k source compiler. It independently uses source-reviewed 59 original Git blobs and 19 Git-blob-verified original main Office sources, preserves all source bytes, and records **78 unique ordered filenames, source commit/blob SHA, SHA256, original bundle hash**. There are precisely **18 original Office predecessors before unchanged 0055**, and one authentic 20260910070300 Communication Hub FK-index source after 0057 and before 0058.

This is an immutable, **non-executable review candidate**: `releaseAuthorized=false`, `productionSqlGenerated=false`, `hostedTouched=false`, `providerManagedAuthStorageProven=false`, and `signedInAlapProRlsProven=false`. Do not copy it to managed Supabase or count it as an approved customer-baseline release without independent PO/release/security sign-off, complete Office role/ACL/RLS/supersession review and a new guarded release-unit Plan Before Code.

## New native runtime final grants evidence

A new dedicated GitHub Actions job runs on its own real Docker `postgres:17` with exact container peer IP, target DB `f6_u03i_fresh`, `postgres` role and major-version identity checks, and explicitly rejects inherited external libpq/Supabase selectors. It runs the existing original F6-U03k 78-file source transaction unchanged with original target preflight, postflight, neutral seed and COMMIT, *then* issues only a read-only ACL query against the actual committed database.

The query identifies exact function OIDs from complete v2/v3 signatures in `pg_proc`, checks native effective `has_function_privilege` for `anon`, `authenticated` and `service_role`, checks implicit/explicit PUBLIC grants via `aclexplode`, and verifies both functions are actually `SECURITY DEFINER`.

The required final state is: **v2 EXECUTE denied to anon, authenticated, service_role and PUBLIC; v3 EXECUTE denied to anon/authenticated/PUBLIC but allowed to service_role only**. Missing OIDs, null effective privileges, changed signatures, wrong endpoint, omitted postflight/COMMIT or incorrect role grants fail the independent proof. Unit tests include forced-contradictory privilege rows and source order/tamper/duplicate rejection.

## Explicit remaining release blockers

A successful native ACL probe does **not** prove every other Office function/trigger/policy/grant, managed Supabase Auth or Storage, authenticated Alap/Pro JWT tenant RLS, hosted TLS/project endpoint identity, lock/restore behavior, nor future customer journeys. The original F6-U03b `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` remains before `DROP SCHEMA`. No schema writes to `waterk-platform`, paused `waterk-staging`, or hosted Fresh Install are authorized; no new paid Supabase project.

**Completion for this unit means only** versioned 78-source review-candidate and native final v2/v3 Docker PostgreSQL17 effective-privilege diagnostic, bound to exact-head independent CI, Security Audit, Quality, TypeScript, production build, Completion Truth and Lifecycle proof. #1186 and #1228 stay OPEN, PR DRAFT, and the next independently guarded release package approval and true hosted provider/tenant acceptance remain BLOCKED.

### Review-candidate fingerprint integrity
The public manifest validator also checks the canonical SHA-256 of the full JSON candidate payload (excluding its own digest). Filename count, ordinal positions and Git blob string shape alone are insufficient: any post-generation source path/blob/order alteration that has valid field shapes but an unchanged digest must fail closed. This is a content-integrity checksum, **not** a signature or independent repository source authority; generation independently re-verifies Git source bytes.
