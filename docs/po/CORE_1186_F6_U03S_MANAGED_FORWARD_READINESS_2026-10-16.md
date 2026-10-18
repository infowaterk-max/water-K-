# Core #1186 — F6-U03s original Office source to managed Fresh Install release bridge
Date: 2026-10-16 | Branch `feature/core-1186-f6-u03s-forward-release-readiness` stacked on encrypted backup #1394

## Verified before implementation
- `main` SHA `dc726ea075d6918883595442d446e37c023731e4`.
- Encrypted Fresh Install logical application backup, Actions [38942232452](https://github.com/infowaterk-max/water-K-/actions/runs/38942232452), owner-only key separately downloadable and actual CMS AES-256-GCM decrypt verified in this conversation. Owner retention **outside ChatGPT not confirmed**.
- Successful local native PG17 occupied original 0046 → 0058 rehearsal with preserved historical tenant/customer Office rows, participant backfill and rollback [38986502348](https://github.com/infowaterk-max/water-K-/actions/runs/38886502348). All 78 originals remain unchanged: 47 original 0046 sources and **31 ordered original forward SQL sources**.
- Live read-only managed Supabase snapshot at **2026-10-16T18:24:34.775Z**, project `istjjkdcvsvilrycqecd`: PG17, 175 public/two private tables, zero auth users/MFA/identities/sessions, zero storage objects, four known buckets, six provider event triggers, 113 neutral catalog rows, zero tenants/customer Office rows and empty migration ledger. Modern Office participant table absent; legacy `office_*_store_all` policy names still present.
- Two active projects: `waterk-platform` and Fresh Install. `waterk-staging` stays INACTIVE.

## F6-U03s contract
Implement `scripts/shoperation-f6-u03s-forward-release-readiness.mjs`, reusing **canonical source verification** from U03l + U03r rather than copying SQL. It binds 78 immutable files, 31 forward suffix files, checks exact SHA-256, emits **only read-only catalog SQL and a non-executable source manifest**, and assesses actual Supabase observations with explicitly bounded provenance. The machine result remains `BLOCKED_RELEASE_PREREQUISITES`, with `releaseAuthorized:false`, even if legacy target and encrypted backup are both valid.

**No hosted changes** in this unit. Outstanding before a separate managed SQL rollout: confirmed durable custody of the separate private key, migration history provenance/reconciliation (hosted ledger currently empty), signed Supabase JWT plus real managed HTTP/API Alap/Pro tenant/denial journeys, and full provider-managed Auth/Storage recovery caveat. Recheck the target inside any future migration transaction, preserving fail-closed guards. No change to waterk-platform/staging, no paid branches, no reset, no source rewriting, no merge, and #1186/#1228 stay open.

Project purpose: retire unsafe assumptions, not increase SQL development scope. The already proven 31-source local replay is reused; only the missing managed release gate is implemented.
