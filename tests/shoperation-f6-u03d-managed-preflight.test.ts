import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error F6-U03d is deliberately a small JS-only, nonconnecting auditor.
import{TARGET_PROJECT_REF,RESET_EXECUTION_ENABLED,SCOPE,EXPECTED_SCHEMAS,EXPECTED_EVENTS,READ_ONLY_SQL,validateReadOnlySnapshot,offlineReviewContract}from'../scripts/shoperation-f6-u03d-managed-preflight.mjs';

const good=()=>({
 database:'postgres',dbRole:'postgres',serverMajor:17,
 publicTables:175,privateTables:2,authUsers:0,authIdentities:0,authSessions:0,
 storageObjects:0,migrationHistory:0,
 schemaGrants:Object.entries(EXPECTED_SCHEMAS as Record<string,{owner:string;acl:string[]}>).map(([name,o])=>({name,owner:o.owner,acl:[...o.acl]})),
 externalDependencies:[{owner_schema:'auth',dependent_class:'pg_trigger',deptype:'n',
   dependent:'trigger on_auth_user_created on table auth.users',
   referenced:'function private.handle_new_user()'}],
 eventTriggers:(EXPECTED_EVENTS as [string,string,string][]).map(([name,event,fn])=>({
   name,event,function:fn,schema:'extensions',enabled:'O',owner:'supabase_admin',
 })),
 storageBuckets:[
 {id:'digital-products-private',public:false,limit:2147483648},
 {id:'order-documents-private',public:false,limit:26214400},
 {id:'product-documents-private',public:false,limit:26214400},
 {id:'product-media',public:true,limit:8388608},
 ],
});
const verify=(s:ReturnType<typeof good>,ref=TARGET_PROJECT_REF)=>validateReadOnlySnapshot(s,{connectorProjectRef:ref});
describe('Core F6-U03d read-only managed schema safety',()=>{
 it('accepts only the historical known snapshot as REVIEW_ONLY without execution permission',()=>{
  const a=verify(good());
  expect(a.decision).toBe('REVIEW_ONLY');
  expect(a.resetEligible).toBe(false);
  expect(a.hostedExecutionEnabled).toBe(false);
  expect(a.knownExternalDependencyCount).toBe(1);
  expect(a.eventTriggerCount).toBe(6);
  expect(a.actualCustomerMigrationsApplied).toBe(0);
  expect(a.remainingBlockers).toContain('SCHEMA_ACL_REGRANT_NOT_IMPLEMENTED');
 });
 it('refuses every caller-selected Supabase project except Fresh Install',()=>{
  for(const ref of ['ewdederyvnwmghlydbno','rfuvzgumbardvbvqjxdq','','other'])
   expect(()=>verify(good(),ref)).toThrow('F6U03D_WRONG_CONNECTOR_PROJECT');
 });
 it.each(['publicTables','privateTables','authUsers','authSessions','authIdentities','storageObjects','migrationHistory'] as const)(
 'blocks changed target state for %s',key=>{
  const s=good();s[key]+=1;
  expect(()=>verify(s)).toThrow('F6U03D_TARGET_DRIFT:'+key);
 });
 it('rejects a known auth trigger disappearing as well as new managed dependencies',()=>{
  const a=good();a.externalDependencies=[];
  expect(()=>verify(a)).toThrow('F6U03D_EXTERNAL_DEPENDENCY_DRIFT');
  const b=good();b.externalDependencies.push({owner_schema:'storage',dependent_class:'pg_rewrite',deptype:'n',dependent:'rule external',referenced:'function public.fn()'});
  expect(()=>verify(b)).toThrow('F6U03D_EXTERNAL_DEPENDENCY_DRIFT');
 });
 it('blocks exact same trigger but different function or hidden unknown owner namespace',()=>{
  const a=good();a.externalDependencies[0].referenced='function public.other()';
  expect(()=>verify(a)).toThrow('F6U03D_EXTERNAL_DEPENDENCY_UNEXPECTED');
  const b=good();b.externalDependencies[0].owner_schema='?';
  expect(()=>verify(b)).toThrow('F6U03D_EXTERNAL_DEPENDENCY_UNEXPECTED');
 });
 it.each(['public','private'])('blocks lost required schema grant in %s',schema=>{
  const s=good();s.schemaGrants.find(x=>x.name===schema)!.acl.pop();
  expect(()=>verify(s)).toThrow('F6U03D_SCHEMA_ACL_DRIFT:'+schema);
 });
 it('detects extra/duplicated schema ACLs and unexpected schema owner',()=>{
  const s=good();s.schemaGrants.find(x=>x.name==='public')!.acl.push('PUBLIC=UC/postgres');
  expect(()=>verify(s)).toThrow('F6U03D_SCHEMA_ACL_DRIFT:public');
  const t=good();t.schemaGrants.find(x=>x.name==='private')!.owner='unapproved';
  expect(()=>verify(t)).toThrow('F6U03D_SCHEMA_ACL_DRIFT:private');
 });
 it('allows ACL presentation order to vary without changing privilege authority',()=>{
  const s=good();s.schemaGrants[0].acl.reverse();s.schemaGrants.reverse();
  expect(verify(s).decision).toBe('REVIEW_ONLY');
 });
 it('detects extra event trigger or changed Supabase event function',()=>{
  const s=good();s.eventTriggers.push({name:'unknown',event:'sql_drop',function:'unknown()',schema:'extensions',enabled:'O',owner:'supabase_admin'});
  expect(()=>verify(s)).toThrow('F6U03D_EVENT_TRIGGER_SET_DRIFT');
  const t=good();t.eventTriggers[0].function='dangerous()';
  expect(()=>verify(t)).toThrow('F6U03D_EVENT_TRIGGER_DRIFT');
 });
 it('refuses disabled or ownership-drifted event trigger',()=>{
  const s=good();s.eventTriggers[0].enabled='D';
  expect(()=>verify(s)).toThrow('F6U03D_EVENT_TRIGGER_DRIFT');
 });
 it('requires exactly four recognized managed storage buckets, unchanged',()=>{
  const a=good();a.storageBuckets[0].limit=123;
  expect(()=>verify(a)).toThrow('F6U03D_STORAGE_BUCKET_DRIFT');
  const b=good();b.storageBuckets.pop();
  expect(()=>verify(b)).toThrow('F6U03D_STORAGE_BUCKET_SET_DRIFT');
 });
 it('enumerates all special dependent classes instead of guessing unknown owner schema',()=>{
  for(const name of ['pg_trigger','pg_rewrite','pg_constraint','pg_attrdef','pg_policy','pg_class','pg_proc','pg_type','pg_namespace'])
    expect(READ_ONLY_SQL).toContain("'"+name+"'::regclass");
  expect(READ_ONLY_SQL).toContain("owner_schema NOT IN ('public','private','pg_toast')");
  expect(READ_ONLY_SQL).toContain("'?')");
 });
 it('contains no executable SQL mutation or Supabase URI and remains exact-project bound',()=>{
  const x=offlineReviewContract();
  expect(x.decision).toBe('REVIEW_ONLY');expect(x.resetEligible).toBe(false);
  expect(x.hostedConnectionUsed).toBe(false);
  expect(x.querySha256).toMatch(/^[a-f0-9]{64}$/);
  expect(READ_ONLY_SQL.trimStart().startsWith('WITH deps AS')).toBe(true);
  expect(READ_ONLY_SQL.trimEnd().endsWith(';')).toBe(true);
  expect(READ_ONLY_SQL).not.toMatch(/\b(?:DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\s+SCHEMA\b/i);
  expect(RESET_EXECUTION_ENABLED).toBe(false);expect(SCOPE).toBe('READ_ONLY_MANAGED_DEPENDENCY_AND_ACL');
 });
 it('CLI refuses arbitrary execution flags; offline review never opens a database',()=>{
  const v=spawnSync(process.execPath,['scripts/shoperation-f6-u03d-managed-preflight.mjs','--execute'],{encoding:'utf8'});
  expect(v.status).not.toBe(0);expect(v.stderr).toContain('F6U03D_NO_DATABASE_EXECUTION_PATH');
 });
});
