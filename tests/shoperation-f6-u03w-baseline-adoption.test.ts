import {describe,it,expect,beforeAll} from 'vitest';
// @ts-expect-error Source-only Node ESM without TypeScript declaration.
import {assessAdoption,inspectLocalMigrationAuthority,HISTORIC,CONTRACT} from '../scripts/shoperation-f6-u03w-baseline-adoption.mjs';
// @ts-expect-error Source-only Node ESM without TypeScript declaration.
import {buildBoundOriginalForwardSource} from '../scripts/shoperation-f6-u03s-forward-release-readiness.mjs';
let original:any,local:any;
const now=Date.now();
const input=()=>({
 projectRef:'istjjkdcvsvilrycqecd',source:'connected-supabase-readonly',now,original,local,
 github:{...HISTORIC,runConclusion:'failure',jobConclusion:'success'},
 current:{capturedAt:new Date(now).toISOString(),database:'postgres',role:'postgres',pgVersion:170006,
  catalogCount:4621,catalogMd5:'e312b40ad91150ce937f4aa00db587f3',
  migrationRows:0,authUsers:0,modernOfficeParticipants:null}
});
describe('F6-U03w real 0046 Fresh Install baseline history adoption design',()=>{
 beforeAll(()=>{original=buildBoundOriginalForwardSource();local=inspectLocalMigrationAuthority();});
 it('verifies actual repo sources and forbids pushing 400+ unrelated root migrations to Fresh Install',()=>{
  expect(local.rootLegacyMigrationCount).toBeGreaterThanOrEqual(400);
  expect(local.canonicalCustomerSourceCount).toBe(59);
  expect(local.historicRootMayBePushedToFreshInstall).toBe(false);
  expect(local.isolatedNewBaselineWorkspaceRequired).toBe(true);
  expect(original.forwardCount).toBe(31);
 });
 it('distinguishes successful historic proof job from failed enclosing workflow and masked URL',()=>{
  const x=assessAdoption(input());
  expect(x.contract).toBe(CONTRACT);
  expect(x.historicJob.originalJobSucceeded).toBe(true);
  expect(x.historicJob.overallWorkflowSucceeded).toBe(false);
  expect(x.historicJob.targetEndpointCryptographicallyLinked).toBe(false);
  expect(x.knownHosted0046Snapshot.matchesKnownHostedSnapshot).toBe(true);
  expect(x.decision).toBe('HISTORIC_0046_CORROBORATED_ADOPTION_REVIEW_ONLY');
  expect(x.recommendedStrategy).toBe('ISOLATED_NEW_CURRENT_STATE_BASELINE_NOT_47_FAKE_STAMPS');
  expect(x.historicalMigrationsMarkedApplied).toBe(false);
  expect(x.releaseAuthorized).toBe(false);
 });
 it('rejects invented historical success, unrelated job, wrong original Git source, altered root authority',()=>{
  const bad=input();bad.github={...bad.github,runConclusion:'success'};
  expect(()=>assessAdoption(bad)).toThrow('F6U03W_HISTORIC_JOB_EVIDENCE_NOT_EXACT');
  const job=input();job.github={...job.github,jobId:113806799089};
  expect(()=>assessAdoption(job)).toThrow('F6U03W_HISTORIC_JOB_EVIDENCE_NOT_EXACT');
  const source=input();source.original={...original,sourceSetSha256:'0'.repeat(64)};
  expect(()=>assessAdoption(source)).toThrow('F6U03W_ORIGINAL_78_SOURCE_DRIFT');
  const legacy=input();legacy.local={...local,historicRootMayBePushedToFreshInstall:true};
  expect(()=>assessAdoption(legacy)).toThrow('F6U03W_ROOT_MIGRATION_AUTHORITY_DRIFT');
 });
 it('fails closed on remote schema drift, surprise ledger, Auth users or modern 0048',()=>{
  const x=input();x.current.catalogCount=4620;x.current.catalogMd5='f'.repeat(32);
  x.current.migrationRows=1;x.current.authUsers=1;
  x.current.modernOfficeParticipants='office_thread_participants';
  const a=assessAdoption(x);
  expect(a.decision).toBe('BLOCKED_CATALOG_DRIFT');
  expect(a.blockers).toContain('HOSTED_0046_CATALOG_NOT_EQUAL');
  expect(a.blockers).toContain('UNEXPECTED_HOSTED_MIGRATION_LEDGER_ROWS');
  expect(a.blockers).toContain('NEW_AUTH_IDENTITIES_UNREVIEWED');
  expect(a.blockers).toContain('MODERN_0048_ALREADY_PRESENT');
  expect(a.releaseAuthorized).toBe(false);
 });
 it('rejects forged project, stale snapshot, wrong role, malformed state and unverified source',()=>{
  const a=input();a.projectRef='ewdederyvnwmghlydbno';
  expect(()=>assessAdoption(a)).toThrow('F6U03W_UNBOUND_MANAGED_PROJECT');
  const b=input();b.current.capturedAt=new Date(now-901000).toISOString();
  expect(()=>assessAdoption(b)).toThrow('F6U03W_STALE_OR_FUTURE_MANAGED_OBSERVATION');
  const c=input();c.current.role='service_role';
  expect(()=>assessAdoption(c)).toThrow('F6U03W_INVALID_MANAGED_OBSERVATION');
  const d=input();d.current.migrationRows=-1;
  expect(()=>assessAdoption(d)).toThrow('F6U03W_MALFORMED_MANAGED_STATE');
  const e=input();e.source='mocked';
  expect(()=>assessAdoption(e)).toThrow('F6U03W_UNBOUND_MANAGED_PROJECT');
 });
});
