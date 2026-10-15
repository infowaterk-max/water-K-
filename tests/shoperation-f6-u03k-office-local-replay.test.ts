import {describe,it,expect} from 'vitest';
// @ts-expect-error Pure source-only JS diagnostic compiler.
import {composeOriginalSourceDiagnostic,locateActualFailure,classifyLocalOutcome,HOSTED_EXECUTION_ENABLED} from '../scripts/shoperation-f6-u03k-office-local-replay.mjs';
// @ts-expect-error Original 59-file hosted review-only SQL compiler.
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';
describe('Core F6-U03k original 59+18 source diagnostics, not release',()=>{
 it('preserves all 59 frozen SQL and the 18 SHA-pinned original Office files',()=>{
  const x=composeOriginalSourceDiagnostic({mode:'commit'});
  expect(x.manifest.reviewed59Count).toBe(59);
  expect(x.manifest.extraOriginalCount).toBe(18);
  expect(x.manifest.uniqueOriginalFiles).toBe(77);
  expect(x.manifest.extraGitBlobs).toHaveLength(18);
  expect(x.manifest.extraGitBlobs.every((z:string)=>/^[0-9a-f]{40}$/.test(z))).toBe(true);
  expect(x.manifest.predecessorBefore0055Count).toBe(17);
  expect(x.manifest.followupAfter0057Count).toBe(1);
  expect(x.manifest.releaseAuthorized).toBe(false);
 });
 it('has exactly one real BEGIN/COMMIT and correct 17+1 SQL source chronology',()=>{
  const s=composeOriginalSourceDiagnostic({mode:'commit'}).sql;
  expect(s.match(/^BEGIN;$/gm)).toHaveLength(1);
  expect(s.match(/^COMMIT;$/gm)).toHaveLength(1);
  expect(s.match(/-- F6U03I_ORIGINAL_SOURCE/g)).toHaveLength(59);
  expect(s.match(/-- F6U03K_PINNED_ORIGINAL_MAIN_SOURCE/g)).toHaveLength(18);
  const source=s.indexOf('-- F6U03K_PINNED_ORIGINAL_MAIN_SOURCE');
  const old0055=s.indexOf('-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0055_');
  const old0057=s.indexOf('-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0057_');
  const fk=s.indexOf('-- F6U03K_PINNED_ORIGINAL_MAIN_SOURCE supabase/migrations/20260910070300_');
  const old0058=s.indexOf('-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0058_');
  expect(source).toBeGreaterThan(s.indexOf('ORIGINAL TARGET PREFLIGHT'));
  expect(source).toBeLessThan(old0055);
  expect(old0055).toBeLessThan(old0057);
  expect(old0057).toBeLessThan(fk);
  expect(fk).toBeLessThan(old0058);
  expect(s.indexOf('ORIGINAL TARGET POSTFLIGHT')).toBeGreaterThan(old0058);
 });
 it('pre-COMMIT rollback candidate uses distinct local DB and still has 77 authentic sources',()=>{
  const a=composeOriginalSourceDiagnostic({mode:'commit'});
  const b=composeOriginalSourceDiagnostic({mode:'rollback'});
  expect(a.manifest.localDatabase).toBe('f6_u03i_fresh');
  expect(b.manifest.localDatabase).toBe('f6_u03i_abort');
  expect(b.sql).toContain('F6U03I_INJECTED_ABORT_BEFORE_COMMIT');
  expect(b.sql.indexOf('F6U03I_INJECTED_ABORT_BEFORE_COMMIT')).toBeLessThan(b.sql.lastIndexOf('COMMIT;'));
  expect(b.manifest.uniqueOriginalFiles).toBe(77);
 });
 it('parses actual psql error position without falsely passing a failed transaction',()=>{
  const s=composeOriginalSourceDiagnostic({mode:'commit'}).sql;
  const ln=s.slice(0,s.indexOf('-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0055_')).split('\n').length+2;
  const r=locateActualFailure(s,'psql:artifacts/f6-u03k/local-77/commit.sql:'+ln+': ERROR: relation "office_mailboxes" does not exist\n');
  expect(r.decision).toBe('LOCAL_SOURCE_SQL_FAILED');
  expect(r.full77SourcesCommitted).toBe(false);
  expect(r.releaseAuthorized).toBe(false);
  expect(()=>locateActualFailure(s,'ERROR: undiagnosed')).toThrow('F6U03K_MISSING_REAL_SQL_ERROR');
 });
 it('rejects unsupported outcomes and never promotes locally committed 77 sources to release',()=>{
  expect(classifyLocalOutcome({mode:'commit',exitCode:3,actualNoAppObjects:true}).decision).toBe('BLOCKED_REAL_ORIGINAL_SQL');
  expect(()=>classifyLocalOutcome({mode:'commit',exitCode:3,actualNoAppObjects:false})).toThrow('F6U03K_UNSUPPORTED_OR_FALSE_GREEN_OUTCOME');
  const ok=classifyLocalOutcome({mode:'commit',exitCode:0,postflight:true,committed:true});
  expect(ok.decision).toBe('LOCAL_SOURCE_COMMITTED_NOT_RELEASE');
  expect(ok.releaseAuthorized).toBe(false);
  const fault=classifyLocalOutcome({mode:'rollback',exitCode:3,forcedAbort:true,actualNoAppObjects:true});
  expect(fault.decision).toBe('LOCAL_FAULT_ROLLBACK_PROVEN_NOT_RELEASE');
  expect(()=>classifyLocalOutcome({mode:'rollback',exitCode:0,forcedAbort:true,actualNoAppObjects:true})).toThrow();
  expect(()=>composeOriginalSourceDiagnostic({mode:'hosted'})).toThrow('F6U03K_NOT_A_LOCAL_MODE');
 });
 it('keeps fatal F6-U03b hosted review guard before both DROP operations',()=>{
  const g=compileAtomicReview();
  const pos=g.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(g.executionEnabled).toBe(false);
  expect(pos).toBeGreaterThanOrEqual(0);
  expect(g.sql.indexOf('DROP SCHEMA public CASCADE;')).toBeGreaterThan(pos);
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
});
