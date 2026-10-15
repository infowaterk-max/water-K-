# Core #1186 F6-U03k — original SQL predecessor ordering on isolated PostgreSQL17

**2026-10-15 · [DRAFT PR #1355](https://github.com/infowaterk-max/water-K-/pull/1355)** after verified source-only #1353 → blocked 59-source #1350 → #1347 → #1335 → #1332. Owned by #1228. **This is a diagnostic, NOT a new release migration package.**

## Question being tested

The unchanged 59-file Fresh Install baseline stops at 0055 on missing `public.office_mailboxes`. F6-U03j pinned 18 authentic Office source candidate Git blobs from canonical main SHA `dc726ea075d6918883595442d446e37c023731e4`, 23 table-level dependency edges and four creator gaps. The present unit tests which *next* SQL prerequisite or managed-provider dependency blocks the complete original SQL after adding those files in their correct historical positions inside two isolated Docker PostgreSQL17 transactions.

**Critically, exactly 17 candidate Office predecessor sources go after original customer-baseline 0054 and BEFORE 0055.** The original `20260910070300_communication_hub_2_0_fk_indexes_v1.sql` is a **follow-up** after original 0057 and before 0058, not an inbound prerequisite. The original 59 SQL bodies, 18 original timestamped source bodies, auth-bootstrap, preflight, neutral seed and original postflight are unchanged. The existing immutable canonical source blob verifiers run before any SQL is emitted. No mock Office tables are created in provider fixtures.

The entire diagnostic SQL is a **single** original `BEGIN`... `COMMIT` envelope. It is **not** an approved forward migration ordering and may contain older superseded Office/Team Chat authorization/grants. These are explicitly *not* release-approved; a real working database test does not decide policy acceptance. An external hosted DB connector/driver is absent.

## Real PostgreSQL17 proof and limitations

A dedicated GitHub Actions service creates **two** disposable Docker postgres:17 databases, `f6_u03i_fresh` and `f6_u03i_abort`, with exactly the previously audited provider fixture bootstraps. Explicit container peer-IP/database-name/role/version comparison and rejection of inherited libpq/Supabase connection selectors are mandatory before any SQL.

The first database executes the unchanged sources with `psql -X -v ON_ERROR_STOP=1`. On any genuine source SQL failure, the workflow keeps the nonzero exit, exact ERROR line, last original source marker and independent read-only empty public/private object counts. Machine verdict **`BLOCKED_REAL_ORIGINAL_SQL`**, all release and provider flags false. A diagnostic workflow may succeed at producing a *correctly blocked* report — that is **not** a successful schema installation.

Only if all genuine source SQL, original target-postflight and COMMIT succeed does the second independent original-source transaction execute with a deliberate exception before COMMIT and verify no app-owned persisted schema. Even then the conclusion is *local source-only diagnostic*, **never** hosted release authorization.

## Hard stop and next unit

This unit **does not edit or create any migration under** `supabase/customer-baseline` or `supabase/migrations`; the original F6-U03b `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` remains before `DROP SCHEMA`, and the F6-U03f strict live catalog guard remains unchanged. No Supabase project changes, staging activation, managed provider writes, or Fresh Install schema reset.

The next issue #1228 authority must reconcile original SQL function, trigger, FK, grants, RLS policy, provider, and supersession semantics into a separately approved **versioned ordered customer-baseline release package** and then perform a real PG17 transaction plus an independent rollback with no mock Office tables. Live hosted TLS/endpoint provider Auth/Storage, signed-in tenant Alap/Pro RLS and 59-file hosted execution remain BLOCKED.

CI proof requires critical Development Guard and Plan Before Code before implementation, targeted negative tests and independent Docker PG17 source audit, then exact-head Quality, TypeScript, production build, Security Audit, Completion Truth and Lifecycle. Any missing first SQL error is a test failure, not silently accepted.

### 2026-10-15 compiler correction
An initial source-only compilation surfaced a genuine JavaScript string interpolation hazard: passing PostgreSQL source SQL containing `$$`/`$'`/backtick-prefixed `$` sequences as the replacement *string* to `String.replace` can silently expand JS replacement placeholders, duplicating COMMIT or corrupting SQL. The composer now uses a function callback for each replacement and requires each authentic source SQL string to appear byte-for-byte unchanged inside the final transaction; negative test protects exact single COMMIT. This is not migration SQL or provider modification.

### Source-verified inbound v2 precursor (incremental real PG17 proof)
Original Docker PG17 source diagnostic #38807351988 reached the authentic 20260908030000 v3 Real Inbound source and failed at its REVOKE for missing function `public.record_inbound_office_email_v2(text,text,text,text,text)`, with rollback/no persisted app schema confirmed. The original `supabase/migrations/20260903180000_inbound_office_email_atomic_v2.sql` creates that function; canonical main Git blob `af19a674a026054a89e3d5fbad43a7258371aa2f`. The *local diagnostic only* now additionally source-pins the unchanged v2 SQL as predecessor. There are **18 pre-0055** sources and 1 post-0057 source, total **59+19 = 78 original files**; this does not approve a historical sender-only inbound API for use in production, and final service-role EXECUTE rights require separate review.
