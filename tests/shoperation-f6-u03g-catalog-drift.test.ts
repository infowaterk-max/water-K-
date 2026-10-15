import {describe,it,expect} from 'vitest';
// @ts-expect-error Source-only JS PostgreSQL17 fixture diagnostic.
import {SCOPE,HOSTED_EXECUTION_ENABLED,EXPECTED_KINDS,EXPECTED_OBJECT_COUNT,HOSTED_RAW_MD5,compileCatalogQueries,parseKindRows,parseRawCatalog,classifyCatalogObservation} from '../scripts/shoperation-f6-u03g-catalog-drift.mjs';
// @ts-expect-error Original F6-U03f SQL-only guard.
import {TRANSACTION_GUARD_SQL} from '../scripts/shoperation-f6-u03f-target-transaction-guard.mjs';
// @ts-expect-error Historical 0046 source selection, no database client.
import {selectHistorical0046} from '../scripts/shoperation-f6-u03g-positive-fixture.mjs';
// @ts-expect-error Review-only 59-file source compiler.
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';
const kinds=()=>EXPECTED_KINDS.map((x:{kind:string,count:number,md5:string})=>[x.kind,x.count,x.md5].join('|')).join('\n')+'\n';
const manifest=()=>{const h=selectHistorical0046();return {sourceCount:47,scope:'LOCAL_HISTORICAL_0046_ONLY',
 sourceSetSha256:h.sourceSetSha256,files:h.files.map((f:{path:string,hash:string})=>({path:f.path,hash:f.hash}))};};
const report=(kindRows=kinds(),rawCatalog='4621|'+HOSTED_RAW_MD5+'\n',other={})=>
 classifyCatalogObservation({kindRows,rawCatalog,manifest:manifest(),realPg17:true,atomicReplayCommitted:true,...other});
describe('Core F6-U03g actual 0046 PG17 raw catalog class-drift diagnosis',()=>{
 it('derives seven-kind SQL from the original canonical full-guard query without rewriting its body',()=>{
  const q=compileCatalogQueries();
  expect(q.original).toContain('pg_get_functiondef(p.oid)');
  expect(q.grouped).toContain("split_part(k,':',1)");
  expect(q.grouped).toContain('GROUP BY 1 ORDER BY 1');
  expect(q.original).toContain('SELECT count(*),md5(string_agg(');
  expect(q.original).not.toMatch(/\bDROP\s+SCHEMA\b/i);
  expect(q.grouped).not.toMatch(/\bDROP\s+SCHEMA\b/i);
  expect(q.canonicalGuardSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(()=>compileCatalogQueries(TRANSACTION_GUARD_SQL+' -- rewritten')).toThrow('F6U03G_CANONICAL_GUARD_MUTATED');
 });
 it('pins the independently observed real hosted seven group fingerprints and 4621 objects',()=>{
  expect(EXPECTED_KINDS).toHaveLength(7);
  expect(EXPECTED_KINDS.reduce((s:number,x:{count:number})=>s+x.count,0)).toBe(EXPECTED_OBJECT_COUNT);
  expect(EXPECTED_OBJECT_COUNT).toBe(4621);
  expect(parseKindRows(kinds())).toHaveLength(7);
 });
 it('never promotes a local signature match to live target or full guard authorization',()=>{
  const r=report();
  expect(r.decision).toBe('DIAGNOSTIC_COMPLETE');
  expect(r.classParity).toBe('GROUP_HASHES_MATCH_ONLY');
  expect(r.mismatchedKinds).toEqual([]);
  expect(r.originalFullGuardAccepted).toBe(false);
  expect(r.hosted59MigrationsApplied).toBe(0);
  expect(r.hostedSupabaseTouched).toBe(false);
  expect(r.authenticatedAlapProRlsProven).toBe(false);
  expect(SCOPE).toBe('LOCAL_HISTORICAL_0046_KIND_FINGERPRINT_ONLY');
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
 it('detects equal-count content hash tampering as a specific class mismatch',()=>{
  const tampered=kinds().replace(EXPECTED_KINDS[2].md5,'00000000000000000000000000000000');
  const r=report(tampered,'4621|0a35cc2fe5766ee4f1a77e5be8027fa8');
  expect(r.classParity).toBe('BLOCKED');
  expect(r.mismatchedKinds).toEqual(['fn']);
  expect(r.rawHashMatches).toBe(false);
 });
 it('records object count drift without false raw parity',()=>{
  const r=report(kinds().replace('column|1981|','column|1982|'),'4622|0a35cc2fe5766ee4f1a77e5be8027fa8');
  expect(r.classParity).toBe('BLOCKED');
  expect(r.mismatchedKinds).toEqual(['column']);
  expect(r.actualObjects).toBe(4622);
 });
 it('rejects missing or extra category, duplicate name, malformed hash and invalid catalog',()=>{
  expect(()=>parseKindRows(kinds().trim().split('\n').slice(0,6).join('\n'))).toThrow('F6U03G_KIND_SET_DRIFT');
  expect(()=>parseKindRows(kinds().replace('column|','unrecognized|'))).toThrow('F6U03G_KIND_NAMES_DRIFT');
  expect(()=>parseKindRows(kinds().replace('column|1981|','fn|1981|'))).toThrow('F6U03G_KIND_NAMES_DRIFT');
  expect(()=>parseKindRows(kinds().replace(EXPECTED_KINDS[0].md5,'BAD_MD5'))).toThrow('F6U03G_KIND_ROW_MALFORMED');
  expect(()=>parseRawCatalog('wrong')).toThrow('F6U03G_RAW_CATALOG_MALFORMED');
 });
 it('rejects aggregate count inconsistencies and impossible kind/raw digest claims',()=>{
  expect(()=>report(kinds(),'4620|'+HOSTED_RAW_MD5)).toThrow('F6U03G_CLASS_TOTAL_VS_RAW_DRIFT');
  expect(()=>report(kinds(),'4621|0a35cc2fe5766ee4f1a77e5be8027fa8')).toThrow('F6U03G_GROUP_RAW_PARITY_CONTRADICTION');
 });
 it('requires genuine PG17 and exactly 47 source-pinned historical migration inputs',()=>{
  expect(()=>report(kinds(),'4621|'+HOSTED_RAW_MD5,{realPg17:false})).toThrow('F6U03G_HISTORICAL_REPLAY_PROOF_REQUIRED');
  expect(()=>report(kinds(),'4621|'+HOSTED_RAW_MD5,{atomicReplayCommitted:false})).toThrow('F6U03G_HISTORICAL_REPLAY_PROOF_REQUIRED');
  expect(()=>report(kinds(),'4621|'+HOSTED_RAW_MD5,{manifest:{sourceCount:47,scope:'LOCAL_HISTORICAL_0046_ONLY',sourceSetSha256:'fake',files:Array(47).fill({})}}))
   .toThrow('F6U03G_HISTORICAL_SOURCE_MANIFEST_DRIFT');
 });
 it('preserves exact 59-file compiler unconditional abort before schema deletion',()=>{
  const r=compileAtomicReview();
  const guard=r.sql.indexOf('DO $f6_guard$'),abort=r.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED'),drop=r.sql.indexOf('DROP SCHEMA private CASCADE;');
  expect(r.migrationCount).toBe(59);
  expect(r.executionEnabled).toBe(false);
  expect(r.mustAbortBeforeDestructiveSql).toBe(true);
  expect(guard).toBeGreaterThanOrEqual(0);
  expect(abort).toBeGreaterThan(guard);
  expect(drop).toBeGreaterThan(abort);
 });
});
