import {beforeAll,describe,it,expect} from 'vitest';
// @ts-expect-error source-only ESM release bundle module has no separate TS declarations.
import {sourceBoundOfficeBundle,assessCandidate,CONTRACT} from '../scripts/shoperation-f6-u03w-office-release-bundle.mjs';
// @ts-expect-error source-only ESM original source prover has no TS declarations.
import {buildBoundOriginalForwardSource} from '../scripts/shoperation-f6-u03s-forward-release-readiness.mjs';
// @ts-expect-error canonical SQL guard source-only module has no TS declarations.
import {TRANSACTION_GUARD_SQL} from '../scripts/shoperation-f6-u03f-target-transaction-guard.mjs';

let original:any,release:any;
beforeAll(()=>{original=buildBoundOriginalForwardSource();release=sourceBoundOfficeBundle({original})},120000);
describe('F6-U03w executable 0046-guarded original Office migration release package',()=>{
 it('emits exact 31 Git SHA-validated source files in one explicit transaction',()=>{
  const {bundle,manifest}=release;
  expect(manifest.contract).toBe(CONTRACT);
  expect(manifest.sources).toHaveLength(31);
  expect(manifest.sources[0].ordinal).toBe(48);
  expect(manifest.sources[30].ordinal).toBe(78);
  expect(bundle.startsWith('BEGIN;\nSET LOCAL lock_timeout')).toBe(true);
  expect(bundle.endsWith('COMMIT;\n')).toBe(true);
  expect(bundle).toContain(TRANSACTION_GUARD_SQL.trim());
  expect(bundle).toContain("F6U03F_APPLICATION_SCHEMA_HASH_DRIFT");
  expect(bundle).toContain("F6U03W_PLAN_SCOPED_POLICY_SET_MISSING");
  expect(bundle).toContain("F6U03W_HISTORY_MUTATION_FORBIDDEN");
  expect(bundle).toContain("F6U03W_UNEXPECTED_AUTH_OR_TENANT_AFTER_MIGRATION");
  expect((bundle.match(/^-- F6-U03w ORIGINAL #/gm)||[])).toHaveLength(31);
  const marks=[...bundle.matchAll(/^-- F6-U03w ORIGINAL #(\d+) ([^\s]+) sha256=([0-9a-f]{64})$/gm)];
  expect(marks.map((m:any)=>m[2])).toEqual(manifest.sources.map((x:any)=>x.path));
  expect(marks.map((m:any)=>Number(m[1]))).toEqual(Array.from({length:31},(_,i)=>i+1));
 });
 it('identical source-byte hashes produce a concrete candidate with release still forbidden',()=>{
  const state=assessCandidate(release);
  expect(state.appSqlPrepared).toBe(true);
  expect(state.sourceCount).toBe(31);
  expect(state.managedSqlExecuted).toBe(false);
  expect(state.migrationLedgerReconciled).toBe(false);
  expect(state.releaseAuthorized).toBe(false);
  expect(release.manifest.releaseAuthorized).toBe(false);
  expect(release.manifest.ownerKeyCustodyConfirmed).toBe(false);
 });
 it('rejects modified original SQL even when filename and manifest path are unchanged',()=>{
  expect(()=>sourceBoundOfficeBundle({original,readSource:()=>'SELECT 1;'}))
   .toThrow('F6U03W_ORIGINAL_SQL_BYTES_SHA_DRIFT');
 });
 it('rejects reordered, duplicated or tampered manifest source sets',()=>{
  const cloned={...original,paths:original.paths.slice()};
  [cloned.paths[0],cloned.paths[1]]=[cloned.paths[1],cloned.paths[0]];
  expect(()=>sourceBoundOfficeBundle({original:cloned})).toThrow('F6U03W_ORDERED_SOURCE_IDENTITY_DRIFT');
  expect(()=>sourceBoundOfficeBundle({original:{...original,sourceSetSha256:'0'.repeat(64)}}))
   .toThrow('F6U03W_ORIGINAL_78_SOURCE_AUTHORITY_INVALID');
  const guard=TRANSACTION_GUARD_SQL.replace('ACCESS EXCLUSIVE MODE NOWAIT','ACCESS SHARE MODE');
  expect(()=>sourceBoundOfficeBundle({original,guardSql:guard}))
   .toThrow('F6U03W_PINNED_0046_TRANSACTION_GUARD_DRIFT');
 });
 it('detects post-creation transaction or authority tampering, without running any SQL',()=>{
  const x={...release,manifest:{...release.manifest,releaseAuthorized:true}};
  expect(()=>assessCandidate(x)).toThrow('F6U03W_EXECUTABLE_BUNDLE_MANIFEST_INVALID');
  expect(()=>assessCandidate({...release,bundle:release.bundle.replace('COMMIT;\n','')}))
   .toThrow('F6U03W_EXECUTABLE_BUNDLE_MANIFEST_INVALID');
  expect(()=>assessCandidate({...release,manifest:{...release.manifest,ledgerHistoryReconciled:true}}))
   .toThrow('F6U03W_EXECUTABLE_BUNDLE_MANIFEST_INVALID');
 });
});
