import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{evaluateOfficeDbReadiness,OFFICE_CATALOG_READONLY_SQL,OFFICE_TABLES,REQUIRED_OFFICE_MIGRATIONS}from'../scripts/shoperation-office-db-readiness.mjs';

const now=new Date('2026-10-10T06:30:00Z');
const v2=readFileSync('supabase/migrations/20261015090000_digital_office_plan_scoped_sql_guard_v2.sql','utf8');
const privacy=readFileSync('supabase/customer-baseline/migrations/0051_digital_office_rls_helper_exposure_closure_v1.sql','utf8');
function fnDefinition(source:string,name:string){
 const from=source.indexOf('create or replace function '+name+'(');
 if(from<0)throw Error('MISSING_TEST_FUNCTION:'+name);
 const to=source.indexOf('revoke all on function ',from);
 if(to<0)throw Error('MISSING_TEST_FUNCTION_END:'+name);
 return source.slice(from,to);
}
function functionFixture(){
 return[
  {schema:'public',name:'can_read_office_thread_v1',definition:fnDefinition(v2,'public.can_read_office_thread_v1'),authenticatedExecute:false,anonExecute:false},
  {schema:'private',name:'office_effective_feature_enabled_v1',definition:fnDefinition(v2,'private.office_effective_feature_enabled_v1')},
  {schema:'private',name:'current_user_can_read_office_thread_v1',definition:fnDefinition(privacy,'private.current_user_can_read_office_thread_v1')},
  {schema:'private',name:'office_thread_plan_allowed_v2',definition:fnDefinition(v2,'private.office_thread_plan_allowed_v2')},
  {schema:'private',name:'office_task_plan_allowed_v2',definition:fnDefinition(v2,'private.office_task_plan_allowed_v2')},
 ];
}
function fixture(){
 return{
  contract:'shoporation.office-db-catalog-snapshot.v1',target:'staging',capturedAt:'2026-10-10T06:20:00Z',
  migrations:REQUIRED_OFFICE_MIGRATIONS.map(version=>({version,name:'migration-'+version})),
  schemaPrerequisites:{participantTablePresent:true,threadConversationTypePresent:true,privateCurrentUserReadHelperPresent:true},
  planAuthority:{normalizedGrantTablePresent:true,tenantSyncPresent:true,tenantSyncUsesNormalizedGrants:true},
  functions:functionFixture(),
  policies:OFFICE_TABLES.flatMap(table=>{
   const thread=table==='office_threads';
   const task=table==='office_tasks';
   return[
    {schemaname:'public',tablename:table,policyname:table+'_store_all',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'SELECT',
     qual:task
      ? "(thread_id is null and public.can_manage_support(instance_id,auth.uid())) or (thread_id is not null and private.current_user_can_read_office_thread_v1(instance_id,thread_id))"
      : thread?'private.current_user_can_read_office_thread_v1(instance_id,id)':'private.current_user_can_read_office_thread_v1(instance_id,thread_id)'},
    {schemaname:'public',tablename:table,policyname:table+'_plan_scoped_v2',permissive:'RESTRICTIVE',roles:'{authenticated}',cmd:'SELECT',
     qual:task?'private.office_task_plan_allowed_v2(instance_id,thread_id)':thread?'private.office_thread_plan_allowed_v2(instance_id,id)':'private.office_thread_plan_allowed_v2(instance_id,thread_id)'},
   ];
  }),
 };
}
const evaluate=(s:any)=>evaluateOfficeDbReadiness(s,{now});

describe('Core #1186 U10A2-F6-U02: non-mutating Office plan-scoped database metadata truth',()=>{
 it('reports only metadata candidate with valid current-user Alap/Pro SQL and NEVER hosted DONE',()=>{
  const s=fixture();
  expect(REQUIRED_OFFICE_MIGRATIONS).toContain('20261015090000');
  expect(REQUIRED_OFFICE_MIGRATIONS).not.toContain('20260909204825');
  expect(REQUIRED_OFFICE_MIGRATIONS).not.toContain('20260910061815');
  expect(REQUIRED_OFFICE_MIGRATIONS).not.toContain('20261010093000');
  const r=evaluate(s);
  expect(r.findings).toEqual([]);
  expect(r.decision).toBe('REVIEW');
  expect(r.claim).toBe('METADATA_CANDIDATE_ONLY');
  expect(r.authoritative).toBe(false);
  expect(r.requires).toContain('canonical-source-lineage-proof');
  expect(r.requires).toContain('authenticated-role-behavioral-proof');
 });
 it('rejects real legacy staging shape, old ALL policies, function and migration prerequisites',()=>{
  const s=fixture();
  s.migrations=[{version:'20260924170254',name:'legacy'}];
  s.policies=OFFICE_TABLES.map(table=>({schemaname:'public',tablename:table,policyname:table+'_store_all',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'ALL',qual:'can_manage_support(instance_id)'}));
  s.functions=[];
  const r=evaluate(s);
  expect(r.decision).toBe('BLOCK');
  expect(r.findings.filter((f:{code:string})=>f.code==='OFFICE_DB_MIGRATION_MISSING')).toHaveLength(REQUIRED_OFFICE_MIGRATIONS.length);
  expect(r.findings.filter((f:{code:string})=>f.code==='OFFICE_DB_BROAD_ALL_POLICY')).toHaveLength(3);
  expect(r.findings.filter((f:{code:string})=>f.code==='OFFICE_DB_PLAN_SCOPED_RLS_MISSING')).toHaveLength(3);
  expect(r.findings.map((f:{code:string})=>f.code)).toContain('OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING');
 });
 it('rejects missing modern v2 migration even with all expected policies and functions',()=>{
  const s=fixture();s.migrations=s.migrations.filter(x=>x.version!=='20261015090000');
  expect(evaluate(s).findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_MIGRATION_MISSING',version:'20261015090000'}));
 });
 it('rejects the old blanket Pro RESTRICTIVE policy even alongside corrected v2 RLS',()=>{
  for(const table of OFFICE_TABLES){
   const s=fixture();
   s.policies.push({schemaname:'public',tablename:table,policyname:table+'_strict_pro_v1',permissive:'RESTRICTIVE',roles:'{authenticated}',cmd:'SELECT',qual:'private.office_pro_plan_allowed_v1(instance_id)'});
   const codes=evaluate(s).findings.map((f:{code:string})=>f.code);
   expect(codes).toContain('OFFICE_DB_ALAP_CUSTOMER_READ_BLOCKED');
   expect(codes).toContain('OFFICE_DB_UNKNOWN_RESTRICTIVE_POLICY');
  }
 });
 it('rejects missing corrected RESTRICTIVE guard, unreviewed guards, broad ALL and missing user-bound permissive path',()=>{
  for(const table of OFFICE_TABLES){
   const a=fixture();a.policies=a.policies.filter(p=>p.tablename!==table);
   expect(evaluate(a).findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_AUTHENTICATED_SELECT_POLICY_MISSING',table}));
   const b=fixture();b.policies=b.policies.filter(p=>p.policyname!==table+'_plan_scoped_v2');
   expect(evaluate(b).findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_PLAN_SCOPED_RLS_MISSING',table}));
   const c=fixture();c.policies=c.policies.map(p=>p.tablename===table&&p.permissive==='PERMISSIVE'?{...p,qual:'can_manage_support(instance_id)'}:p);
   expect(evaluate(c).findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_PARTICIPANT_POLICY_MISSING',table}));
   const d=fixture();d.policies.push({schemaname:'public',tablename:table,policyname:'legacy',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'ALL',qual:'can_manage_support(instance_id)'});
   expect(evaluate(d).findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_BROAD_ALL_POLICY',table,policy:'legacy'}));
  }
 });
 it('rejects spoofed, absent or historical globally Pro-only public SQL helper definitions',()=>{
  const empty=fixture();empty.functions=empty.functions.filter(f=>f.name!=='can_read_office_thread_v1');
  expect(evaluate(empty).findings.map((f:{code:string})=>f.code)).toContain('OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING');
  const fake=fixture();fake.functions=fake.functions.map(f=>f.name==='can_read_office_thread_v1'?{...f,definition:'create function public.can_read_office_thread_v1 returns boolean as $$ select true $$'}:f);
  expect(evaluate(fake).findings.map((f:{code:string})=>f.code)).toContain('OFFICE_DB_READ_FUNCTION_PLAN_SCOPE_INVALID');
  const old=fixture();old.functions=old.functions.map(f=>f.name==='can_read_office_thread_v1'?{...f,definition:readFileSync('supabase/migrations/20261010093000_digital_office_strict_pro_sql_guard_v1.sql','utf8')}:f);
  expect(evaluate(old).findings.map((f:{code:string})=>f.code)).toContain('OFFICE_DB_READ_FUNCTION_PLAN_SCOPE_INVALID');
 });
 it('rejects browser-exposed actor-param definer, missing current-user, weak task and Pro override helpers',()=>{
  const s=fixture();s.functions=s.functions.map(f=>f.name==='can_read_office_thread_v1'?{...f,authenticatedExecute:true}:f);
  expect(evaluate(s).findings.map((f:{code:string})=>f.code)).toContain('OFFICE_DB_BROWSER_ACTOR_RPC_EXPOSED');
  for(const [name,code] of [
   ['current_user_can_read_office_thread_v1','OFFICE_DB_CURRENT_USER_RLS_HELPER_INVALID'],
   ['office_thread_plan_allowed_v2','OFFICE_DB_THREAD_PLAN_HELPER_INVALID'],
   ['office_task_plan_allowed_v2','OFFICE_DB_TASK_PLAN_HELPER_INVALID'],
   ['office_effective_feature_enabled_v1','OFFICE_DB_ADVANCED_PRO_CAP_UNVERIFIED'],
  ]){
   const t=fixture();t.functions=t.functions.filter(f=>f.name!==name);
   expect(evaluate(t).findings.map((f:{code:string})=>f.code)).toContain(code);
  }
 });
 it('blocks unknown/stale/missing/partial snapshots and divergent normalized plan authority',()=>{
  expect(evaluateOfficeDbReadiness(null,{now}).decision).toBe('BLOCK');
  for(const mutate of [
   (s:any)=>{delete s.functions},(s:any)=>{s.capturedAt='2026-10-01T00:00:00Z'},
   (s:any)=>{s.capturedAt='2026-10-11T00:00:00Z'},(s:any)=>{s.target='unknown'},
   (s:any)=>{s.contract='bad'},(s:any)=>{s.planAuthority.tenantSyncUsesNormalizedGrants=false}
  ]){const s:any=fixture();mutate(s);expect(evaluate(s).decision).toBe('BLOCK')}
 });
 it('emits only credential-free read-only catalog SQL, including SQL body/EXECUTE permissions',()=>{
  expect(OFFICE_CATALOG_READONLY_SQL.trimStart()).toMatch(/^select\b/i);
  expect(OFFICE_CATALOG_READONLY_SQL).toContain('pg_policies');
  expect(OFFICE_CATALOG_READONLY_SQL).toContain('pg_get_functiondef(p.oid)');
  expect(OFFICE_CATALOG_READONLY_SQL).toContain("has_function_privilege('authenticated'");
  expect(OFFICE_CATALOG_READONLY_SQL).toContain('supabase_migrations.schema_migrations');
  expect(OFFICE_CATALOG_READONLY_SQL).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s+(table|policy|from|into|on|function)/i);
  const catalog=readFileSync(resolve(process.cwd(),'src/lib/plans/catalog.ts'),'utf8');
  expect(catalog).toContain("'officeCommunication'");
  expect(catalog).toContain("'officeCommunicationAdvanced'");
 });
});

import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
// @ts-ignore Intentional ESM JavaScript runtime module without a declaration file.
import {evaluateOfficeBaselineLineage,OFFICE_BASELINE_MINIMUM_SOURCES,OFFICE_BASELINE_SUPERSEDED_SOURCES} from '../scripts/shoperation-office-baseline-lineage.mjs';

describe('Core #1186 U10A2 additive Office Fresh Install source lineage gate',()=>{
  const a='20260908022500_privacy.sql';
  const b='20261010093000_strict_pro.sql';
  function base(){
    const root=mkdtempSync(join(tmpdir(),'office-lineage-'));
    const src=join(root,'supabase/migrations'),dst=join(root,'supabase/customer-baseline/migrations');
    mkdirSync(src,{recursive:true});mkdirSync(dst,{recursive:true});
    writeFileSync(join(dst,'0001_snapshot.sql'),'-- historical baseline\n');
    writeFileSync(join(dst,'0026_legacy_a.sql'),'-- historical duplicate numbering\n');
    writeFileSync(join(dst,'0026_legacy_b.sql'),'-- historical duplicate numbering\n');
    writeFileSync(join(dst,'0046_alap_reconcile.sql'),'-- historical Alap contract\n');
    const sql:Record<string,string>={
      [a]:'create table if not exists public.office_dummy(id uuid);\n',
      [b]:'create or replace function private.office_pro_dummy() returns boolean language sql as $$ select false $$;\n',
    };
    for(const [name,body] of Object.entries(sql))writeFileSync(join(src,name),body);
    const add=(number:number,name:string,body=sql[name])=>{
      const digest=createHash('sha256').update(sql[name]||'').digest('hex');
      writeFileSync(join(dst,`${String(number).padStart(4,'0')}_office.sql`),`-- Shoperation-Office-Source: ${name} sha256=${digest}\n${body}`);
    };
    const scan=()=>evaluateOfficeBaselineLineage({root,requiredSources:[a,b]});
    return {root,src,dst,add,scan,sql,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }
  it('reports current real baseline BLOCKED, not deployed Office ready',()=>{
    const r=evaluateOfficeBaselineLineage();
    expect(r.contract).toBe('shoporation.office-customer-baseline-lineage.v1');
    expect(r.baselineMigrationCount).toBe(59);
    expect(r.requiredSourceCount).toBe(11);
    expect(r.supersededSourceCount).toBe(3);
    expect(OFFICE_BASELINE_SUPERSEDED_SOURCES.map((x:{source:string})=>x.source)).toEqual([
      '20260909204825_team_chat_plan_split_v1.sql',
      '20260910061815_customer_email_plan_split_v1.sql',
      '20261010093000_digital_office_strict_pro_sql_guard_v1.sql',
    ]);
    expect(r.sourceLineageStatus).toBe('SOURCE_PRESENT_UNPROVEN');
    expect(r.releaseReady).toBe(false);
    expect(r.realDatabaseProof).toBe('NOT_EVALUATED');
    expect(r.findings.filter((x:{code:string,source?:string})=>x.code==='OFFICE_BASELINE_SOURCE_MISSING').length).toBe(0);
    expect(r.matchedSourceCount).toBe(11);
    expect(r.findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_BASELINE_NEW_ORDINAL_DRIFT')).toBe(false);
    expect(OFFICE_BASELINE_MINIMUM_SOURCES.at(-1)).toContain('digital_office_plan_scoped_sql_guard_v2');
  });
  it('accepts exact-body chronological source lineage as REVIEW, never DB ready',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      const r=f.scan();
      expect(r.sourceLineageStatus).toBe('SOURCE_PRESENT_UNPROVEN');
      expect(r.decision).toBe('REVIEW');
      expect(r.matchedSourceCount).toBe(2);
      expect(r.releaseReady).toBe(false);
      expect(r.realDatabaseProof).toBe('NOT_EVALUATED');
    }finally{f.cleanup()}
  });
  it('denies a missing prerequisite, even when latest strict Pro SQL is present',()=>{
    const f=base();
    try{f.add(47,b);expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_BASELINE_SOURCE_MISSING'&&x.source===a)).toBe(true)}finally{f.cleanup()}
  });
  it('denies forged provenance with only a matching hash and no SQL',()=>{
    const f=base();
    try{f.add(47,a,'');f.add(48,b);expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_SOURCE_BODY_DRIFT')).toBe(true)}finally{f.cleanup()}
  });
  it('denies a tampered/truncated SQL body, regardless of provenance hash',()=>{
    const f=base();
    try{f.add(47,a,'select 1;\n');f.add(48,b);expect(f.scan().sourceLineageStatus).toBe('BLOCKED')}finally{f.cleanup()}
  });
  it('denies reverse source order and duplicate source replay',()=>{
    const f=base();
    try{
      f.add(47,b);f.add(48,a);
      expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_SOURCE_ORDER_DRIFT')).toBe(true);
      f.add(49,a);
      expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_SOURCE_DUPLICATE')).toBe(true);
    }finally{f.cleanup()}
  });
  it('denies unreviewed migration claims and missing source SQL',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      f.add(49,'not-a-reviewed-source.sql','');
      expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_UNREVIEWED_SOURCE_PROVENANCE')).toBe(true);
      rmSync(join(f.src,b));
      expect(f.scan().findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_SOURCE_FILE_MISSING')).toBe(true);
    }finally{f.cleanup()}
  });
  it('does not treat 0046 historic comments as imported Office migrations',()=>{
    const f=base();
    try{
      const digest=createHash('sha256').update(f.sql[a]).digest('hex');
      writeFileSync(join(f.dst,'0046_alap_reconcile.sql'),`-- Shoperation-Office-Source: ${a} sha256=${digest}\n${f.sql[a]}`);
      expect(f.scan().sourceLineageStatus).toBe('BLOCKED');
    }finally{f.cleanup()}
  });
  it('preserves current normalized 0014 grants and 0046 Alap/Pro split as the supersession authority',()=>{
    const normalized=readFileSync(resolve(process.cwd(),'supabase/customer-baseline/migrations/0014_block11_entitlement_contract_v1.sql'),'utf8');
    const reconciled=readFileSync(resolve(process.cwd(),'supabase/customer-baseline/migrations/0046_alap_team_chat_plan_grant_reconcile.sql'),'utf8');
    expect(normalized).toContain('create table if not exists public.plan_capability_grants(');
    expect(normalized).toContain('create or replace function private.sync_webshop_plan_entitlements(');
    expect(normalized).toContain('from public.plan_capability_grants g');
    expect(reconciled).toContain("where plan_code = 'alap'");
    expect(reconciled).toContain("and capability_code = 'teamChat'");
    expect(reconciled).toContain("where plan_code = 'pro' and capability_code = 'teamChat'");
    expect(reconciled).toContain("where plan_code = 'alap' and capability_code = 'officeCommunication'");
    expect(reconciled).toContain('ALAP_TEAM_CHAT_STALE_PLAN_ROW_REMAINS');
    for(const {source} of OFFICE_BASELINE_SUPERSEDED_SOURCES.slice(0,2)){
      const old=readFileSync(resolve(process.cwd(),'supabase/migrations',source),'utf8');
      expect(old).toMatch(/create or replace function private\.sync_webshop_plan_entitlements\(/i);
      expect(old).toMatch(/v_features\s*:=\s*array\s*\[/i);
      expect(OFFICE_BASELINE_MINIMUM_SOURCES).not.toContain(source);
    }
  });
  it('BLOCKs exact-provenance replay of both superseded legacy plan sync sources',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      for(const [i,{source}] of OFFICE_BASELINE_SUPERSEDED_SOURCES.slice(0,2).entries()){
        const original=readFileSync(resolve(process.cwd(),'supabase/migrations',source),'utf8');
        f.sql[source]=original;
        writeFileSync(join(f.src,source),original);
        f.add(49+i,source);
      }
      const result=f.scan();
      expect(result.decision).toBe('BLOCK');
      expect(result.findings.filter((x:{code:string})=>x.code==='OFFICE_SUPERSEDED_SOURCE_REPLAY')).toHaveLength(2);
      expect(result.findings.filter((x:{code:string})=>x.code==='OFFICE_LEGACY_PLAN_SYNC_REPLAY')).toHaveLength(2);
      expect(result.releaseReady).toBe(false);
    }finally{f.cleanup()}
  });
  it('BLOCKs a renamed and unmarked copy of fixed-list entitlement sync SQL',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      const old=readFileSync(resolve(process.cwd(),'supabase/migrations/20260910061815_customer_email_plan_split_v1.sql'),'utf8');
      writeFileSync(join(f.dst,'0049_renamed_legacy_sync.sql'),old);
      const result=f.scan();
      expect(result.decision).toBe('BLOCK');
      expect(result.findings).toContainEqual(expect.objectContaining({code:'OFFICE_LEGACY_PLAN_SYNC_REPLAY',file:'0049_renamed_legacy_sync.sql'}));
      expect(result.realDatabaseProof).toBe('NOT_EVALUATED');
    }finally{f.cleanup()}
  });
  it('BLOCKs unsafe historic strict Pro v1 by exact marker even when v2 is already present',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      const name='20261010093000_digital_office_strict_pro_sql_guard_v1.sql';
      const original=readFileSync(resolve(process.cwd(),'supabase/migrations',name),'utf8');
      f.sql[name]=original;
      writeFileSync(join(f.src,name),original);
      f.add(49,name);
      const report=f.scan();
      expect(report.decision).toBe('BLOCK');
      expect(report.findings).toContainEqual(expect.objectContaining({code:'OFFICE_SUPERSEDED_SOURCE_REPLAY',source:name}));
      expect(report.findings).toContainEqual(expect.objectContaining({code:'OFFICE_UNSAFE_GLOBAL_PRO_RLS_REPLAY'}));
    }finally{f.cleanup()}
  });
  it('BLOCKs renamed unmarked global Pro v1 RLS even if corrected migration was already loaded',()=>{
    const f=base();
    try{
      f.add(47,a);f.add(48,b);
      const old=readFileSync(resolve(process.cwd(),'supabase/migrations/20261010093000_digital_office_strict_pro_sql_guard_v1.sql'),'utf8');
      writeFileSync(join(f.dst,'0049_renamed_strict_pro.sql'),old);
      expect(f.scan().findings).toContainEqual(expect.objectContaining({code:'OFFICE_UNSAFE_GLOBAL_PRO_RLS_REPLAY',file:'0049_renamed_strict_pro.sql'}));
    }finally{f.cleanup()}
  });
  it('preserves explicit CLI fail-closed modes and non-mutating diagnostic mode',()=>{
    const normal=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs'],{cwd:process.cwd(),encoding:'utf8'});
    expect(normal.status).toBe(0);
    expect(JSON.parse(normal.stdout).sourceLineageStatus).toBe('SOURCE_PRESENT_UNPROVEN');
    const required=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs','--require-source-parity'],{cwd:process.cwd(),encoding:'utf8'});
    expect(required.status).toBe(0);
    expect(JSON.parse(required.stdout).sourceLineageStatus).toBe('SOURCE_PRESENT_UNPROVEN');
    const deploy=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs','--require-office-pro-ready'],{cwd:process.cwd(),encoding:'utf8'});
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toContain('OFFICE_DB_PROOF_REQUIRED');
  });
});
