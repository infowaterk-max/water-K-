import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{evaluateOfficeDbReadiness,OFFICE_CATALOG_READONLY_SQL,OFFICE_TABLES,REQUIRED_OFFICE_MIGRATIONS}from'../scripts/shoperation-office-db-readiness.mjs';
const now=new Date('2026-10-10T06:30:00Z');
function fixture(){
  return{
    contract:'shoporation.office-db-catalog-snapshot.v1',target:'staging',capturedAt:'2026-10-10T06:20:00Z',
    migrations:REQUIRED_OFFICE_MIGRATIONS.map(version=>({version,name:'migration-'+version})),
    schemaPrerequisites:{participantTablePresent:true,threadConversationTypePresent:true,privateCurrentUserReadHelperPresent:true},
    planAuthority:{normalizedGrantTablePresent:true,tenantSyncPresent:true,tenantSyncUsesNormalizedGrants:true},
    functions:[{schema:'public',name:'can_read_office_thread_v1'},{schema:'private',name:'office_pro_plan_allowed_v1'}],
    policies:OFFICE_TABLES.flatMap(table=>[
      {schemaname:'public',tablename:table,policyname:table+'_store_all',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'SELECT',qual:'public.can_read_office_thread_v1(instance_id,id,auth.uid())'},
      {schemaname:'public',tablename:table,policyname:table+'_pro_plan',permissive:'RESTRICTIVE',roles:'{authenticated}',cmd:'SELECT',qual:'private.office_pro_plan_allowed_v1(instance_id)'},
    ]),
  };
}
describe('Core #1186 U09 read-only Office database deployment readiness',()=>{
  it('BLOCKs the actual staging legacy shape, including ALL policies and missing migrations/helper',()=>{
    const s=fixture();
    s.policies=OFFICE_TABLES.map(table=>({schemaname:'public',tablename:table,policyname:table+'_store_all',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'ALL',qual:'can_manage_support(instance_id)'}));
    s.functions=[];s.migrations=[{version:'20260924170254',name:'incident_intelligence_foundation_v1'}];
    const r=evaluateOfficeDbReadiness(s,{now});
    expect(r.decision).toBe('BLOCK');expect(r.authoritative).toBe(false);
    expect(r.findings.filter(x=>x.code==='OFFICE_DB_BROAD_ALL_POLICY')).toHaveLength(3);
    expect(r.findings.filter(x=>x.code==='OFFICE_DB_PRO_SUBSCRIPTION_RLS_MISSING')).toHaveLength(3);
    expect(r.findings.filter(x=>x.code==='OFFICE_DB_MIGRATION_MISSING')).toHaveLength(REQUIRED_OFFICE_MIGRATIONS.length);
    expect(r.findings.map(x=>x.code)).toContain('OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING');
  });
  it('BLOCKs missing advanced Office guard migration even with prior migrations and valid RLS metadata',()=>{
    const version='20260910070200';
    expect(REQUIRED_OFFICE_MIGRATIONS).toContain(version);
    const s=fixture();
    s.migrations=s.migrations.filter(entry=>entry.version!==version);
    const r=evaluateOfficeDbReadiness(s,{now});
    expect(r.decision).toBe('BLOCK');
    expect(r.claim).toBe('DB_NOT_READY');
    expect(r.findings).toContainEqual(expect.objectContaining({code:'OFFICE_DB_MIGRATION_MISSING',version}));
  });
  it('never marks a clean metadata candidate as authoritative DONE',()=>{
    const r=evaluateOfficeDbReadiness(fixture(),{now});
    expect(r.decision).toBe('REVIEW');expect(r.claim).toBe('METADATA_CANDIDATE_ONLY');
    expect(r.authoritative).toBe(false);expect(r.findings).toEqual([]);
    expect(r.requires).toContain('tenant-plan-transition-proof');
  });
  it('BLOCKs missing/partial/stale/unknown-target and future-dated snapshots',()=>{
    expect(evaluateOfficeDbReadiness(null,{now}).decision).toBe('BLOCK');
    for(const mutate of [
      (s:any)=>{delete s.functions},(s:any)=>{s.capturedAt='2026-10-01T00:00:00Z'},
      (s:any)=>{s.capturedAt='invalid'},(s:any)=>{s.capturedAt='2026-10-11T00:00:00Z'},
      (s:any)=>{s.target='unscoped'},(s:any)=>{s.contract='unknown'},
    ]){const s:any=fixture();mutate(s);expect(evaluateOfficeDbReadiness(s,{now}).decision).toBe('BLOCK')}
  });
  it('BLOCKs a single legacy broad ALL policy even if restrictive Pro policies coexist',()=>{
    const s=fixture();s.policies.push({schemaname:'public',tablename:'office_tasks',policyname:'legacy',permissive:'PERMISSIVE',roles:'{authenticated}',cmd:'ALL',qual:'can_manage_support(instance_id)'});
    expect(evaluateOfficeDbReadiness(s,{now}).findings).toContainEqual({code:'OFFICE_DB_BROAD_ALL_POLICY',table:'office_tasks',policy:'legacy'});
  });
  it('BLOCKs every missing table, missing participant guard and missing Pro subscription predicate',()=>{
    for(const table of OFFICE_TABLES){
      const a=fixture();a.policies=a.policies.filter(p=>p.tablename!==table);
      expect(evaluateOfficeDbReadiness(a,{now}).findings).toContainEqual({code:'OFFICE_DB_AUTHENTICATED_SELECT_POLICY_MISSING',table});
      const b=fixture();b.policies=b.policies.filter(p=>p.policyname!==table+'_pro_plan');
      expect(evaluateOfficeDbReadiness(b,{now}).findings).toContainEqual({code:'OFFICE_DB_PRO_SUBSCRIPTION_RLS_MISSING',table});
      const c=fixture();c.policies=c.policies.map(p=>p.tablename===table&&p.permissive==='PERMISSIVE'?{...p,qual:'can_manage_support(instance_id)'}:p);
      expect(evaluateOfficeDbReadiness(c,{now}).findings).toContainEqual({code:'OFFICE_DB_PARTICIPANT_POLICY_MISSING',table});
    }
  });
  it('BLOCKs phantom Pro helper and service-role-only policies',()=>{
    const a=fixture();a.functions=a.functions.filter(f=>f.name!=='office_pro_plan_allowed_v1');
    expect(evaluateOfficeDbReadiness(a,{now}).findings.map(f=>f.code)).toContain('OFFICE_DB_PRO_PLAN_HELPER_MISSING');
    const b=fixture();b.policies=b.policies.map(p=>({...p,roles:'{service_role}'}));
    expect(evaluateOfficeDbReadiness(b,{now}).findings.filter(f=>f.code==='OFFICE_DB_AUTHENTICATED_SELECT_POLICY_MISSING')).toHaveLength(3);
  });
  it('BLOCKs missing Office privacy schema prerequisites independently of policy SQL',()=>{
    const missing=[
      ['participantTablePresent','OFFICE_DB_PARTICIPANT_TABLE_MISSING'],
      ['threadConversationTypePresent','OFFICE_DB_CONVERSATION_TYPE_MISSING'],
      ['privateCurrentUserReadHelperPresent','OFFICE_DB_PRIVATE_CURRENT_USER_HELPER_MISSING'],
    ] as const;
    for(const [field,code] of missing){
      const s=fixture();(s.schemaPrerequisites as Record<string,boolean>)[field]=false;
      const r=evaluateOfficeDbReadiness(s,{now});
      expect(r.decision).toBe('BLOCK');expect(r.findings.map(x=>x.code)).toContain(code);
      expect(r.authoritative).toBe(false);
    }
  });
  it('preserves canonical Block 11 normalized plan-sync authority and never silently recommends stale fixed-array replacement',()=>{
    const noTable=fixture();noTable.planAuthority.normalizedGrantTablePresent=false;
    expect(evaluateOfficeDbReadiness(noTable,{now}).findings.map(x=>x.code)).toContain('OFFICE_DB_PLAN_AUTHORITY_MISSING');
    const noSync=fixture();noSync.planAuthority.tenantSyncPresent=false;
    expect(evaluateOfficeDbReadiness(noSync,{now}).findings.map(x=>x.code)).toContain('OFFICE_DB_PLAN_AUTHORITY_MISSING');
    const fixedArray=fixture();fixedArray.planAuthority.tenantSyncUsesNormalizedGrants=false;
    expect(evaluateOfficeDbReadiness(fixedArray,{now}).findings.map(x=>x.code)).toContain('OFFICE_DB_PLAN_SYNC_AUTHORITY_DIVERGED');
    expect(evaluateOfficeDbReadiness(fixture(),{now}).requires).toContain('current-Block11-plan-sync-compatibility');
  });
  it('BLOCKs absent or malformed topology snapshots, even with old positive RLS-only indicators',()=>{
    for(const field of ['schemaPrerequisites','planAuthority'] as const){
      const absent:any=fixture();delete absent[field];
      expect(evaluateOfficeDbReadiness(absent,{now}).decision).toBe('BLOCK');
      const malformed:any=fixture();malformed[field]=[];
      expect(evaluateOfficeDbReadiness(malformed,{now}).findings.map(x=>x.code)).toContain('OFFICE_DB_SNAPSHOT_PARTIAL');
    }
  });
  it('is a credential-free read-only catalog SQL query and preserves Alap core email',()=>{
    expect(OFFICE_CATALOG_READONLY_SQL.trimStart()).toMatch(/^select\b/i);
    expect(OFFICE_CATALOG_READONLY_SQL).toContain('pg_policies');
    expect(OFFICE_CATALOG_READONLY_SQL).toContain('supabase_migrations.schema_migrations');
    expect(OFFICE_CATALOG_READONLY_SQL).toContain("to_regclass('public.office_thread_participants')");
    expect(OFFICE_CATALOG_READONLY_SQL).toContain("to_regclass('public.plan_capability_grants')");
    expect(OFFICE_CATALOG_READONLY_SQL).toContain("to_regprocedure('private.sync_webshop_plan_entitlements(uuid)')");
    expect(OFFICE_CATALOG_READONLY_SQL).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s+(table|policy|from|into|on|function)/i);
    const catalog=readFileSync(resolve(process.cwd(),'src/lib/plans/catalog.ts'),'utf8');
    expect(catalog).toContain("'officeCommunication'");expect(catalog).toContain("'officeCommunicationAdvanced'");
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
    expect(r.baselineMigrationCount).toBe(58);
    expect(r.requiredSourceCount).toBe(11);
    expect(r.supersededSourceCount).toBe(2);
    expect(OFFICE_BASELINE_SUPERSEDED_SOURCES.map((x:{source:string})=>x.source)).toEqual([
      '20260909204825_team_chat_plan_split_v1.sql',
      '20260910061815_customer_email_plan_split_v1.sql',
    ]);
    expect(r.sourceLineageStatus).toBe('BLOCKED');
    expect(r.releaseReady).toBe(false);
    expect(r.realDatabaseProof).toBe('NOT_EVALUATED');
    expect(r.findings.filter((x:{code:string,source?:string})=>x.code==='OFFICE_BASELINE_SOURCE_MISSING').length).toBe(1);
    expect(r.matchedSourceCount).toBe(10);
    expect(r.findings.some((x:{code:string,source?:string})=>x.code==='OFFICE_BASELINE_NEW_ORDINAL_DRIFT')).toBe(false);
    expect(OFFICE_BASELINE_MINIMUM_SOURCES.at(-1)).toContain('digital_office_strict_pro_sql_guard');
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
    for(const {source} of OFFICE_BASELINE_SUPERSEDED_SOURCES){
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
      for(const [i,{source}] of OFFICE_BASELINE_SUPERSEDED_SOURCES.entries()){
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
  it('preserves explicit CLI fail-closed modes and non-mutating diagnostic mode',()=>{
    const normal=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs'],{cwd:process.cwd(),encoding:'utf8'});
    expect(normal.status).toBe(0);
    expect(JSON.parse(normal.stdout).sourceLineageStatus).toBe('BLOCKED');
    const required=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs','--require-source-parity'],{cwd:process.cwd(),encoding:'utf8'});
    expect(required.status).toBe(1);
    expect(required.stderr).toContain('OFFICE_SOURCE_LINEAGE_BLOCKED');
    const deploy=spawnSync(process.execPath,['scripts/shoperation-office-baseline-lineage.mjs','--require-office-pro-ready'],{cwd:process.cwd(),encoding:'utf8'});
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toContain('OFFICE_DB_PROOF_REQUIRED');
  });
});
