import {describe,it,expect} from 'vitest';
// @ts-expect-error JS source-only compiler
import {composeLocalFresh59,validateIsolatedObservation,HOSTED_EXECUTION_ENABLED} from '../scripts/shoperation-f6-u03i-local-59-proof.mjs';
// @ts-expect-error JS canonical reviewer
import {validateReviewedBaseline} from '../scripts/shoperation-disposable-fresh-replay.mjs';
// @ts-expect-error JS canonical review
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';

describe('F6-U03i 59-source PostgreSQL17 atomicity',()=>{
 it('keeps source-verified ordered 59 migrations',()=>{
  const a=composeLocalFresh59({mode:'commit'});
  const v=validateReviewedBaseline();
  expect(v.migrationCount).toBe(59);
  expect(a.manifest.originalPaths).toEqual(v.migrationFiles);
  expect(a.manifest.sourceSetSha256).toBe(v.sourceSetSha256);
  expect(a.manifest.originalPaths.filter((x:string)=>x.includes('/0026_'))).toHaveLength(2);
 });
 it('has exactly one transaction, genuine preflight and postflight',()=>{
  const x=composeLocalFresh59({mode:'commit'}).sql;
  expect(x.match(/^BEGIN;$/gm)).toHaveLength(1);
  expect(x.match(/^COMMIT;$/gm)).toHaveLength(1);
  expect(x.match(/-- F6U03I_ORIGINAL_SOURCE/g)).toHaveLength(59);
  expect(x.indexOf('ORIGINAL TARGET PREFLIGHT')).toBeLessThan(x.indexOf('0001_shoperation_v1_schema.sql'));
  expect(x.indexOf('ORIGINAL TARGET POSTFLIGHT')).toBeGreaterThan(x.indexOf('0058_digital_office_plan_scoped_sql_guard_v2.sql'));
  expect(x.indexOf('ORIGINAL TARGET POSTFLIGHT')).toBeLessThan(x.lastIndexOf('COMMIT;'));
 });
 it('separates positive and injected rollback on different databases',()=>{
  const a=composeLocalFresh59({mode:'commit'}),b=composeLocalFresh59({mode:'rollback'});
  expect(a.sql).toContain('f6_u03i_fresh');
  expect(b.sql).toContain('f6_u03i_abort');
  expect(b.sql.indexOf('F6U03I_INJECTED_ABORT_BEFORE_COMMIT')).toBeLessThan(b.sql.lastIndexOf('COMMIT;'));
  expect(a.manifest.sqlSha256).not.toBe(b.manifest.sqlSha256);
 });
 it('fails closed on invalid requests and incomplete proof',()=>{
  expect(()=>composeLocalFresh59({mode:'other'})).toThrow('F6U03I_LOCAL_MODE_INVALID');
  const positive=composeLocalFresh59({mode:'commit'}).manifest;
  expect(()=>validateIsolatedObservation({manifest:positive,realPg17:true,originalSqlCompleted:true,positivePostflight:false,appTables:190,appFunctions:400,appPolicies:130})).toThrow();
  const rollback=composeLocalFresh59({mode:'rollback'}).manifest;
  expect(()=>validateIsolatedObservation({manifest:rollback,realPg17:true,originalSqlCompleted:false,transactionRolledBack:true,appTables:0,appFunctions:1,appPolicies:0})).toThrow('F6U03I_INCOMPLETE_ROLLBACK');
 });
 it('does not change original review-only hosted guard',()=>{
  const g=compileAtomicReview();
  const stop=g.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(g.migrationCount).toBe(59);
  expect(g.executionEnabled).toBe(false);
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
  expect(stop).toBeGreaterThanOrEqual(0);
  expect(g.sql.indexOf('DROP SCHEMA public CASCADE;')).toBeGreaterThan(stop);
 });
});
