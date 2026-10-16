# Core #1186 / #1228 — F6-U03r Existing Office data migration: 0046→0058

The historical 78 reviewed original Git migration SQL sources are split at original 0047 marker: 47 legacy sources through 0046, then 31 source-authentic originals from 0047 through 0058 including 19 historical main SQL dependencies. No original SQL source is edited or duplicated.

**Real native PostgreSQL17 proof, not another empty installation:** After first SQL transaction installs original 0046 schema in an isolated Docker database, a synthetic Alap tenant, owner, role and real historic Office customer thread/message/task are inserted and committed. The original remaining 31 source files are applied in a later transaction: first fault injection before COMMIT proves the old schema and data survive, then a successful COMMIT proves the historical records, customer participant backfill, modern Office RLS predicate, and authenticated read grant survive.

The original empty-target preflight executes only on the original clean stage. The original empty-target postflight is deliberately omitted from the occupied stage because its own accepted contract requires zero customer records, which would falsely reject a valid occupied upgrade.

**No managed Supabase writes, no staging resume, no new project, no automatic merge.** Local role/JWT shims are not provider-issued signed JWT, managed PostgREST, Storage or production acceptance. Hosted migration ledger and actual schema provenance remain blocked pending reviewed rollout, despite this local occupied-upgrade evidence. Core #1186 / #1228 stay open.
