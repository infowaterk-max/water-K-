import {describe,it,expect,beforeAll} from 'vitest';
// @ts-expect-error Source-only Node ESM proof module without TS declaration.
import {buildBoundOriginalForwardSource} from '../scripts/shoperation-f6-u03s-forward-release-readiness.mjs';
// @ts-expect-error Source-only Node ESM proof module without TS declaration.
import {buildReadOnlyProvenanceSQL,assessProvenance,SCOPE} from '../scripts/shoperation-f6-u03t-provenance-gate.mjs';

let original:any;
const timestamp='2026-10-16T19:08:54.108Z',at=Date.parse(timestamp)+60000;
const good=()=>({
 projectRef:'istjjkdcvsvilrycqecd',source:'connected-supabase-readonly',now:at,original,
 observed:{capturedAt:timestamp,database:'postgres',role:'postgres',pgVersion:170006,
  catalogCount:4621,catalogMd5:'e312b40ad91150ce937f4aa00db587f3',
  migrationLedger:0,modernOfficeParticipants:null}
});
describe('F6-U03t readonly managed 0046 catalog and migration provenance guard',()=>{
 beforeAll(()=>{original=buildBoundOriginalForwardSource()});
 it('reuses canonical PG17 catalogue and only emits SELECT without hosted writes',()=>{
  const sql=buildReadOnlyProvenanceSQL();
  expect(sql).toContain('WITH object_defs AS (');
  expect(sql).toContain('pg_get_functiondef');
  expect(sql).toContain('supabase_migrations.schema_migrations');
  expect(sql).toContain('f6_u03t_readonly FROM object_defs');
  expect((sql.match(/;/g)||[]).length).toBe(1);
  expect(sql).not.toMatch(/\b(?:CREATE|ALTER|TRUNCATE|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE)\s+(?:TABLE|POLICY|SCHEMA|FUNCTION|INTO|FROM|ON)\b/i);
 });
 it('known-host 4621-object parity does not imply source lineage or provider JWT proof',()=>{
  const report=assessProvenance(good());
  expect(report.scope).toBe(SCOPE);
  expect(report.knownHostedCatalog.matchesKnownHistoricalHostSnapshot).toBe(true);
  expect(report.knownHostedCatalog.doesNotProveSourceMigrationLineage).toBe(true);
  expect(report.decision).toBe('BLOCKED_PROVENANCE_AND_PROVIDER_PROOF');
  expect(report.blockers).toContain('0046_MANAGED_MIGRATION_PROVENANCE_UNATTESTED');
  expect(report.providerSignedJwtProven).toBe(false);
  expect(report.releaseAuthorized).toBe(false);
 });
 it('rejects foreign project, simulated source and forged original SQL manifest',()=>{
  const wrong=good();wrong.projectRef='ewdederyvnwmghlydbno';
  expect(()=>assessProvenance(wrong)).toThrow('F6U03T_FOREIGN_PROJECT_OR_UNATTESTED_SOURCE');
  const simulated=good();simulated.source='local-pg17';
  expect(()=>assessProvenance(simulated)).toThrow('F6U03T_FOREIGN_PROJECT_OR_UNATTESTED_SOURCE');
  const modified=good();modified.original={...original,sourceSetSha256:'f'.repeat(64)};
  expect(()=>assessProvenance(modified)).toThrow('F6U03T_SOURCE_MANIFEST_INVALID');
 });
 it('classifies catalog fault, migration ledger change and premature 0048',()=>{
  const x=good();x.observed.catalogCount=4620;x.observed.catalogMd5='0'.repeat(32);
  x.observed.migrationLedger=1;x.observed.modernOfficeParticipants='office_thread_participants';
  const report=assessProvenance(x);
  expect(report.blockers).toContain('HOSTED_0046_CATALOG_DRIFT');
  expect(report.blockers).toContain('HOSTED_MIGRATION_LEDGER_CHANGED_UNVERIFIED');
  expect(report.blockers).toContain('HOSTED_OFFICE_0048_ALREADY_PRESENT');
  expect(report.decision).toBe('BLOCKED_MANAGED_CATALOG_DRIFT');
  expect(report.releaseAuthorized).toBe(false);
 });
 it('rejects stale/future snapshots, malformed ledger, database drift',()=>{
  const stale=good();stale.now=at+900001;
  expect(()=>assessProvenance(stale)).toThrow('F6U03T_STALE_OR_FUTURE_MANAGED_OBSERVATION');
  const future=good();future.now=Date.parse(timestamp)-31000;
  expect(()=>assessProvenance(future)).toThrow('F6U03T_STALE_OR_FUTURE_MANAGED_OBSERVATION');
  const ledger=good();ledger.observed.migrationLedger=-1;
  expect(()=>assessProvenance(ledger)).toThrow('F6U03T_MALFORMED_CATALOG_OR_LEDGER');
  const wrong=good();wrong.observed.database='waterk';
  expect(()=>assessProvenance(wrong)).toThrow('F6U03T_MANAGED_CATALOG_INVALID');
 });
});
