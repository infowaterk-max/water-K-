import {describe,it,expect} from 'vitest';
// @ts-expect-error JS source-only provenance diagnostic.
import {SCOPE,HOSTED_EXECUTION_ENABLED,MAIN_OFFICE_SOURCES,MISSING_RELEASE_TABLE_CREATORS,staticDdl,classifyDagEvidence,inspectOfficeGap} from '../scripts/shoperation-f6-u03j-office-dependency-dag.mjs';
// @ts-expect-error unchanged hosted source-review compiler
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';

describe('Core F6-U03j source-proven Office dependency DAG',()=>{
 it('identifies exactly the 59 frozen original SQL sources and missing Office creators',()=>{
  const r=inspectOfficeGap();
  expect(r.contract).toBe('shoporation.f6-u03j.office-gap.v1');
  expect(r.reviewedFileCount).toBe(59);
  expect(r.decision).toBe('BLOCKED_59_SOURCE_DAG');
  expect(r.candidateSources).toHaveLength(MAIN_OFFICE_SOURCES.length);
  expect(r.candidateSources).toHaveLength(18);
  expect(r.missingRequiredTables).toEqual([...MISSING_RELEASE_TABLE_CREATORS]);
  expect(r.blockingMigration).toContain('0055_communication_hub_2_0_foundation_v1.sql');
  expect(r.blockingTable).toBe('public.office_mailboxes');
  expect(r.approved59SourceSha256).toMatch(/^[0-9a-f]{64}$/);
 });
 it('pins original timestamped main source Git blobs and a real ordered table reference graph',()=>{
  const r=inspectOfficeGap();
  expect(r.candidateSources.every((x:{blob:string,sha256:string})=>/^[0-9a-f]{40}$/.test(x.blob)&&/^[0-9a-f]{64}$/.test(x.sha256))).toBe(true);
  const m=r.canonicalCreators.find((x:{table:string})=>x.table==='office_mailboxes');
  expect(m.source).toBe('20260908030000_digital_office_real_inbound_foundation_v1.sql');
  const e=r.orderedTableDependencyEdges;
  expect(e.some((x:{table:string,dependent:string})=>x.table==='office_mailboxes'&&x.dependent.includes('mailbox_normalization'))).toBe(true);
  expect(e.some((x:{table:string,dependent:string})=>x.table==='office_drafts'&&x.dependent.includes('draft_revision'))).toBe(true);
 });
 it('ignores line-comment fake DDL and preserves real anchored CREATE TABLE',()=>{
  expect(staticDdl('-- CREATE TABLE IF NOT EXISTS public.office_mailboxes (id uuid);').created).toEqual([]);
  const ddl=staticDdl('CREATE TABLE IF NOT EXISTS public.office_mailboxes (id uuid);\nALTER TABLE public.office_mailboxes ADD COLUMN flag boolean;');
  expect(ddl.created).toEqual(['office_mailboxes']);
  expect(ddl.altered).toEqual(['office_mailboxes']);
 });
 it('does not certify an incomplete or forged DAG as a release',()=>{
  expect(()=>classifyDagEvidence({missing:[],sourceCount:59,validMainSources:true}))
   .toThrow('F6U03J_UNEXPECTED_BASELINE_CLOSURE_REQUIRES_NEW_REVIEW');
  expect(()=>classifyDagEvidence({missing:['office_mailboxes'],sourceCount:58,validMainSources:true}))
   .toThrow('F6U03J_SOURCE_CHAIN_EVIDENCE_MISSING');
  expect(()=>classifyDagEvidence({missing:[...MISSING_RELEASE_TABLE_CREATORS],sourceCount:59,validMainSources:false}))
   .toThrow('F6U03J_SOURCE_CHAIN_EVIDENCE_MISSING');
 });
 it('never claims live provider, complete atomic59 or signed-in tenant RLS proof',()=>{
  const r=inspectOfficeGap();
  expect(r.hostedDatabaseTouched).toBe(false);
  expect(r.atomic59Proven).toBe(false);
  expect(r.managedProviderProven).toBe(false);
  expect(r.signedInAlapProRlsProven).toBe(false);
  expect(r.fullRollbackProven).toBe(false);
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
  expect(SCOPE).toBe('SOURCE_ONLY_OFFICE_DAG_CANDIDATES_59_BASELINE_BLOCKED');
 });
 it('keeps the original 59-source hosted compiler fatally guarded before schema DROP',()=>{
  const g=compileAtomicReview();
  const stop=g.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(g.executionEnabled).toBe(false);
  expect(g.migrationCount).toBe(59);
  expect(stop).toBeGreaterThan(0);
  expect(g.sql.indexOf('DROP SCHEMA private CASCADE;')).toBeGreaterThan(stop);
  expect(g.sql.indexOf('DROP SCHEMA public CASCADE;')).toBeGreaterThan(stop);
 });
});
