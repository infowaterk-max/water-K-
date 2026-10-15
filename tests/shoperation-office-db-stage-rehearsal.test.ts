import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  OFFICE_STAGING_PROJECT_ID,OFFICE_STAGE_EXPOSURE_READONLY_SQL,
  REQUIRED_OFFICE_ROLE_PROOFS,evaluateOfficeDbStagingRehearsal,
} from '../scripts/shoperation-office-db-stage-rehearsal.mjs';
import {OFFICE_TABLES,REQUIRED_OFFICE_MIGRATIONS} from '../scripts/shoperation-office-db-readiness.mjs';

const now=new Date('2026-10-12T12:00:00Z'),sha='a'.repeat(40);
const v2=readFileSync('supabase/migrations/20261015090000_digital_office_plan_scoped_sql_guard_v2.sql','utf8');
const privacy=readFileSync('supabase/customer-baseline/migrations/0051_digital_office_rls_helper_exposure_closure_v1.sql','utf8');
function fnDef(s:string,name:string){
  const i=s.indexOf('create or replace function '+name+'(');
  if(i<0)throw Error('MISSING_STAGE_TEST_FN:'+name);
  const e=s.indexOf('revoke all on function ',i);
  if(e<0)throw Error('MISSING_STAGE_TEST_FN_END:'+name);
  return s.slice(i,e);
}
function currentFunctions(){
  return[
    {schema:'public',name:'can_read_office_thread_v1',definition:fnDef(v2,'public.can_read_office_thread_v1'),authenticatedExecute:false,anonExecute:false},
    {schema:'private',name:'office_effective_feature_enabled_v1',definition:fnDef(v2,'private.office_effective_feature_enabled_v1')},
    {schema:'private',name:'current_user_can_read_office_thread_v1',definition:fnDef(privacy,'private.current_user_can_read_office_thread_v1')},
    {schema:'private',name:'office_thread_plan_allowed_v2',definition:fnDef(v2,'private.office_thread_plan_allowed_v2')},
    {schema:'private',name:'office_task_plan_allowed_v2',definition:fnDef(v2,'private.office_task_plan_allowed_v2')},
  ];
}
function fixture(){
  const snapshot:any={
    contract:'shoporation.office-db-catalog-snapshot.v1',target:'staging',
    capturedAt:'2026-10-12T11:50:00Z',
    migrations:REQUIRED_OFFICE_MIGRATIONS.map(version=>({version,name:'fixture-'+version})),
    schemaPrerequisites:{
      participantTablePresent:true,threadConversationTypePresent:true,privateCurrentUserReadHelperPresent:true,
    },
    planAuthority:{normalizedGrantTablePresent:true,tenantSyncPresent:true,tenantSyncUsesNormalizedGrants:true},
    functions:currentFunctions(),
    policies:OFFICE_TABLES.flatMap(t=>{
      const thread=t==='office_threads',task=t==='office_tasks';
      return[
       {schemaname:'public',tablename:t,policyname:t+'_store_all',permissive:'PERMISSIVE',roles:['authenticated'],cmd:'SELECT',
        qual:task?"(thread_id is null and public.can_manage_support(instance_id,auth.uid())) or (thread_id is not null and private.current_user_can_read_office_thread_v1(instance_id,thread_id))"
          :thread?'private.current_user_can_read_office_thread_v1(instance_id,id)':'private.current_user_can_read_office_thread_v1(instance_id,thread_id)'},
       {schemaname:'public',tablename:t,policyname:t+'_plan_scoped_v2',permissive:'RESTRICTIVE',roles:['authenticated'],cmd:'SELECT',
        qual:task?'private.office_task_plan_allowed_v2(instance_id,thread_id)':thread?'private.office_thread_plan_allowed_v2(instance_id,id)':'private.office_thread_plan_allowed_v2(instance_id,thread_id)'},
      ];
    }),
  };
  const exposure:any={
    contract:'shoporation.office-stage-exposure-snapshot.v1',capturedAt:'2026-10-12T11:50:00Z',
    tableAccess:OFFICE_TABLES.map(table=>({table,authenticatedSelect:true,serviceSelect:true,authenticatedInsert:false})),
    dependencies:{
      evaluateStoreCapabilityPresent:true,privateCurrentUserReaderPresent:true,
      participantTablePresent:true,normalizedPlanSyncPresent:true,normalizedGrantTablePresent:true,
    },
    rowCounts:Object.fromEntries(OFFICE_TABLES.map(t=>[t,0])),
  };
  const roleProofs=REQUIRED_OFFICE_ROLE_PROOFS.map(id=>({id,status:'PASS',projectId:OFFICE_STAGING_PROJECT_ID,sourceSha:sha}));
  return {snapshot,exposure,projectId:OFFICE_STAGING_PROJECT_ID,sourceSha:sha,roleProofs};
}
const check=(x:any)=>evaluateOfficeDbStagingRehearsal(x,{now});
describe('Core #1186 U11B read-only staging migration dependency and rollback rehearsal',()=>{
  it('never claims deployed schema or runtime authority from metadata and even complete claimed role proof rows',()=>{
    const r=check(fixture());
    expect(r.decision).toBe('REVIEW');expect(r.authoritative).toBe(false);
    expect(r.ddlApplied).toBe(false);expect(r.currentRoleProofsVerified).toBe(false);
    expect(r.stages.map((x:any)=>x.id)).toEqual(['S1','S2','S3','S4','S5','S6']);
    expect(r.forbiddenMigrationReplay).toContain('20260910061815_customer_email_plan_split_v1');
    expect(r.forbiddenMigrationReplay).toContain('20261010093000_digital_office_strict_pro_sql_guard_v1');
    expect(REQUIRED_OFFICE_ROLE_PROOFS).toContain('alap_customer_support_select_allowed');
    expect(REQUIRED_OFFICE_ROLE_PROOFS).toContain('alap_internal_chat_select_denied');
    expect(REQUIRED_OFFICE_ROLE_PROOFS).toContain('post_downgrade_private_chat_select_denied');
    expect(REQUIRED_OFFICE_ROLE_PROOFS).not.toContain('alap_office_select_denied');
    expect(REQUIRED_OFFICE_ROLE_PROOFS).not.toContain('post_downgrade_office_select_denied');
  });
  it('BLOCKs the actual legacy ALL-policy and missing privacy schema shape',()=>{
    const x=fixture();x.snapshot.policies=OFFICE_TABLES.map((t:string)=>({
      schemaname:'public',tablename:t,policyname:t+'_store_all',permissive:'PERMISSIVE',
      roles:['authenticated'],cmd:'ALL',qual:'can_manage_support(instance_id)',
    }));
    x.snapshot.functions=[];x.snapshot.migrations=[];x.snapshot.schemaPrerequisites.participantTablePresent=false;
    x.exposure.dependencies.evaluateStoreCapabilityPresent=false;
    x.exposure.tableAccess=x.exposure.tableAccess.map((r:any)=>({...r,authenticatedSelect:false,serviceSelect:false}));
    const r=check(x);
    expect(r.decision).toBe('BLOCK');
    expect(r.findings.map((y:any)=>y.code)).toEqual(expect.arrayContaining([
      'OFFICE_STAGE_BASELINE_NOT_READY','OFFICE_STAGE_READ_GRANT_MISSING','OFFICE_STAGE_CAPABILITY_FUNCTION_MISSING',
    ]));
    expect(r.authoritative).toBe(false);
  });
  it('BLOCKs wrong target, absent commit provenance, missing grant and browser-write denial',()=>{
    const wrong=fixture();wrong.projectId='production';expect(check(wrong).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_TARGET_MISMATCH');
    const noSha=fixture();noSha.sourceSha='latest';expect(check(noSha).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_SOURCE_IDENTITY_MISSING');
    const grants=fixture();grants.exposure.tableAccess[1].serviceSelect=false;
    expect(check(grants).findings).toContainEqual({code:'OFFICE_STAGE_READ_GRANT_MISSING',table:'office_messages'});
    const write=fixture();write.exposure.tableAccess[0].authenticatedInsert=true;
    expect(check(write).findings).toContainEqual({code:'OFFICE_STAGE_BROWSER_WRITE_NOT_REVOKED',table:'office_threads'});
  });
  it('BLOCKs missing evaluator and missing Block 11 grant/sync without assuming old fixed array',()=>{
    const missing=fixture();missing.exposure.dependencies.evaluateStoreCapabilityPresent=false;
    expect(check(missing).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_CAPABILITY_FUNCTION_MISSING');
    const authority=fixture();authority.exposure.dependencies.normalizedPlanSyncPresent=false;
    expect(check(authority).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_BLOCK11_AUTHORITY_MISSING');
    const privacy=fixture();privacy.exposure.dependencies.privateCurrentUserReaderPresent=false;
    expect(check(privacy).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_PRIVATE_READ_DEPENDENCY_MISSING');
  });
  it('BLOCKs all omitted, stale, cross-source, or incomplete actor proof cases',()=>{
    const missing=fixture();missing.roleProofs=[];
    expect(check(missing).findings.filter((x:any)=>x.code==='OFFICE_STAGE_ROLE_BEHAVIOR_UNVERIFIED')).toHaveLength(REQUIRED_OFFICE_ROLE_PROOFS.length);
    const stale=fixture();stale.roleProofs[0].sourceSha='b'.repeat(40);
    expect(check(stale).findings).toContainEqual({code:'OFFICE_STAGE_ROLE_BEHAVIOR_UNVERIFIED',caseId:'anon_select_denied'});
    const partial=fixture();delete partial.exposure.rowCounts.office_threads;
    expect(check(partial).findings).toContainEqual({code:'OFFICE_STAGE_ROW_COUNT_UNKNOWN',table:'office_threads'});
    const old=fixture();old.exposure.capturedAt='2026-10-01T00:00:00Z';
    expect(check(old).findings.map((x:any)=>x.code)).toContain('OFFICE_STAGE_EXPOSURE_STALE_OR_INVALID');
  });
  it('exposes only SELECT metadata SQL and contains no credential, tenant row or DDL operations',()=>{
    expect(OFFICE_STAGE_EXPOSURE_READONLY_SQL.trimStart()).toMatch(/^select\b/i);
    expect(OFFICE_STAGE_EXPOSURE_READONLY_SQL).toContain('has_table_privilege');
    expect(OFFICE_STAGE_EXPOSURE_READONLY_SQL).toContain('to_regprocedure');
    expect(OFFICE_STAGE_EXPOSURE_READONLY_SQL).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s+(table|policy|from|into|on|function)/i);
    expect(OFFICE_STAGE_EXPOSURE_READONLY_SQL).not.toContain('auth.users');
  });
});