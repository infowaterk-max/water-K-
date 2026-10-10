import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{evaluateOfficeDbReadiness,OFFICE_CATALOG_READONLY_SQL,OFFICE_TABLES,REQUIRED_OFFICE_MIGRATIONS}from'../scripts/shoperation-office-db-readiness.mjs';
const now=new Date('2026-10-10T06:30:00Z');
function fixture(){
  return{
    contract:'shoporation.office-db-catalog-snapshot.v1',target:'staging',capturedAt:'2026-10-10T06:20:00Z',
    migrations:REQUIRED_OFFICE_MIGRATIONS.map(version=>({version,name:'migration-'+version})),
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
  it('is a credential-free read-only catalog SQL query and preserves Alap core email',()=>{
    expect(OFFICE_CATALOG_READONLY_SQL.trimStart()).toMatch(/^select\b/i);
    expect(OFFICE_CATALOG_READONLY_SQL).toContain('pg_policies');
    expect(OFFICE_CATALOG_READONLY_SQL).toContain('supabase_migrations.schema_migrations');
    expect(OFFICE_CATALOG_READONLY_SQL).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s+(table|policy|from|into|on|function)/i);
    const catalog=readFileSync(resolve(process.cwd(),'src/lib/plans/catalog.ts'),'utf8');
    expect(catalog).toContain("'officeCommunication'");expect(catalog).toContain("'officeCommunicationAdvanced'");
  });
});
