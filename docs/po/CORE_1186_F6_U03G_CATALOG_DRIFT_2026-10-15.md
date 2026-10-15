# Core #1186 F6-U03g — historical 0046 PostgreSQL catalog drift diagnostics

**2026-10-15 · DRAFT PR #1335**, stacked on #1332 → #1323 → #1322 → #1321 → #1319 → #1317 → #1308 → #1304. The separate sibling #1333/#1334 synthetic guard demonstrations remain draft and are NOT silently merged.

## Observed real blocker

PR #1332 already replayed the original, source-verified 0001–0046 migration set (47 SQL files because there are two distinct 0026 files) in an isolated actual PostgreSQL17 database. The result has 175 public and two private tables, 344 public functions, 126 public RLS policies and 4,621 app definitions. However its raw catalog MD5 is \`0a35cc2fe5766ee4f1a77e5be8027fa8\` versus Fresh Install \`e312b40ad91150ce937f4aa00db587f3\`. The unchanged F6-U03f full guard correctly rejects the disposable database name. Neither should be hidden by changing its expected fingerprint.

Independently retrieved from Fresh Install \`istjjkdcvsvilrycqecd\` on 2026-10-15 with a **read-only** grouping of the exact existing F6-U03f \`object_defs\` query:

| Kind | Count | MD5 |
|---|---:|---|
| column | 1981 | 3d1877e2cec4d6fdccf0533ccd9245e2 |
| constraint | 1161 | f5a8bb48fdfb6acbc3a6aeddba6d4556 |
| fn | 380 | 557b5282f7d7b589436954940bcb0a4d |
| index | 615 | 89c25f46ce63535ba9d7626906b22a7b |
| policy | 126 | 63aa91ed618266d7abcf716835436704 |
| relation | 250 | f27ea2f2f9a7e2e96c89f8d48cd8ecdb |
| trigger | 108 | 2a00a4e40d0e459944aa6c8269a8e5c0 |

The grouped counts sum to 4621. These reference hashes do not certify a future server state, endpoint, transaction or provider behavior.

## Changes and bounded executable proof

- \`scripts/shoperation-f6-u03g-catalog-drift.mjs\` is a **pure offline composer and classifier**, importing the unchanged canonical guard SQL and extracting its exact \`object_defs\` query. It replaces only the terminal aggregate to obtain seven kind counts/hashes; it has **no PostgreSQL client, network connection or hosted execution path**.
- \`tests/shoperation-f6-u03g-catalog-drift.test.ts\` checks source/query immutability, seven kinds, count/hash drift, duplicate/missing/malformed categories, missing real fixture claim, aggregate inconsistency and the existing 59-file compiler's fail-before-DROP behavior.
- \`.github/workflows/f6-u03g-catalog-drift-proof.yml\` runs a disposable **postgres:17** Docker service, requires exact local peer-IP/DB/role/server identity and rejects inherited external selectors, verifies each of the 47 historical migration blobs against the previous canonical commit, executes the actual historical SQL transaction, then runs only read-only original and grouped catalog queries. It produces per-kind diff evidence. A passing *diagnostic* workflow can correctly report \`classParity: BLOCKED\`; this is not a positive full guard or release decision.
- The plan-only workflow runs canonical Development Guard **DEV-90EB737A** and independently verifies Plan Before Code before any code implementation. Exact-head Quality, TypeScript, Build, Security Audit, Completion Truth and Lifecycle proof remain required.

## Explicit stop conditions

The F6-U03b \`FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED\` exception **continues to occur before any \`DROP SCHEMA\`** in the 59-file source compiler. No Supabase project is created, started, paused, altered or targeted by an executable driver. This work does not touch \`waterk-platform\`, \`waterk-staging\` or Fresh Install data. The proof is limited to local historical 47-file SQL and seven diagnostics.

**NOT DONE:** full 59-file real hosted replay, unique TLS/project connection binding, application + provider-managed Auth/Storage/DDL event recovery and quiescence, fresh Data API, tenant-aware signed-in Alap/Pro Office/RLS. Issue #1186 remains OPEN; no merge out of dependency order. The canonical F6-U03f guard and 59-file source hashes are not rewritten to make a fixture pass.
