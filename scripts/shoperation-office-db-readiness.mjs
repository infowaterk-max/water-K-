import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const OFFICE_TABLES=Object.freeze(['office_threads','office_messages','office_tasks']);
export const REQUIRED_OFFICE_MIGRATIONS=Object.freeze([
  '20260908022500', // initial customer/private Office read
  '20260908023000', // membership guard
  '20260908023500', // private author read
  '20260908024000', // current-user RLS helper exposure closure
  '20260909204503', // Team Chat 2 participant foundation
  '20260909204524', // message mention/business-link integrity triggers
  '20260909204547', // current owner transfer
  '20260910070000', // Communication Hub customer mailbox/delegation/scan
  '20260910070100', // non-overwriting default assignee
  '20260910070200', // advanced v2/v6 mail/commerce object guards
  '20261015090000', // corrected Alap customer/Pro internal plan-scoped RLS
]);

// Execute this SELECT using the read-only connected Supabase SQL tool.
// Never feed service-role credentials into this script or infer schema deploy
// readiness from the repository migration filenames alone.
export const OFFICE_CATALOG_READONLY_SQL=String.raw`select jsonb_build_object(
 'contract','shoporation.office-db-catalog-snapshot.v1',
 'capturedAt',now(),
 'policies',coalesce((select jsonb_agg(to_jsonb(p))
   from pg_policies p where p.schemaname='public'
   and p.tablename in ('office_threads','office_messages','office_tasks')),'[]'::jsonb),
 'functions',coalesce((select jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'name',p.proname,
   'args',pg_get_function_identity_arguments(p.oid),
   'definition',pg_get_functiondef(p.oid),
   'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE')))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private')
   and p.proname in ('can_read_office_thread_v1','current_user_can_read_office_thread_v1',
     'office_effective_feature_enabled_v1','office_thread_plan_allowed_v2','office_task_plan_allowed_v2')),'[]'::jsonb),
 'migrations',coalesce((select jsonb_agg(jsonb_build_object(
   'version',version,'name',name))
   from supabase_migrations.schema_migrations),'[]'::jsonb),
 'schemaPrerequisites',jsonb_build_object(
   'participantTablePresent',to_regclass('public.office_thread_participants') is not null,
   'threadConversationTypePresent',exists(
     select 1 from information_schema.columns
      where table_schema='public' and table_name='office_threads' and column_name='conversation_type'),
   'privateCurrentUserReadHelperPresent',to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') is not null
 ),
 'planAuthority',jsonb_build_object(
   'normalizedGrantTablePresent',to_regclass('public.plan_capability_grants') is not null,
   'tenantSyncPresent',to_regprocedure('private.sync_webshop_plan_entitlements(uuid)') is not null,
   'tenantSyncUsesNormalizedGrants',coalesce((
     select position('plan_capability_grants' in pg_get_functiondef(p.oid))>0
       from pg_proc p where p.oid=to_regprocedure('private.sync_webshop_plan_entitlements(uuid)')
   ),false)
 )
) as catalog_snapshot;`;

function rolesOf(policy){
  const v=policy.roles;
  if(Array.isArray(v))return v.map(x=>String(x).toLowerCase());
  if(typeof v==='string')return v.replace(/[{}"]/g,'').split(',').map(s=>s.trim().toLowerCase());
  return [];
}
function visibleToAuthenticated(policy){
  return rolesOf(policy).some(r=>r==='authenticated'||r==='public');
}
function selectBearing(policy){
  return ['ALL','SELECT'].includes(String(policy.cmd??'').toUpperCase());
}
function isProGuard(expression){
  const sql=String(expression??'').toLowerCase().replace(/\s+/g,' ');
  return /office_pro_plan_allowed_v1\s*\(/.test(sql)
    || /subscription_plan\s*=\s*'pro'/.test(sql);
}
function reportFinding(code,details={}){
  return {code,...details};
}
export function evaluateOfficeDbReadiness(snapshot,{now=new Date(),maxAgeHours=24}={}){
  const findings=[];
  const block=(code,details={})=>findings.push(reportFinding(code,details));
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)){
    return{contract:'shoporation.office-db-readiness-report.v1',decision:'BLOCK',claim:'NOT_VERIFIED',findings:[reportFinding('OFFICE_DB_SNAPSHOT_MISSING')]};
  }
  if(snapshot.contract!=='shoporation.office-db-catalog-snapshot.v1')block('OFFICE_DB_SNAPSHOT_CONTRACT_UNKNOWN');
  if(snapshot.target!=='staging'&&snapshot.target!=='production')block('OFFICE_DB_TARGET_UNSCOPED');
  const observed=Date.parse(String(snapshot.capturedAt??''));
  const ageMs=now.getTime()-observed;
  if(!Number.isFinite(observed)||!Number.isFinite(ageMs)||ageMs<0||ageMs>maxAgeHours*3600*1000)
    block('OFFICE_DB_SNAPSHOT_STALE_OR_INVALID',{capturedAt:snapshot.capturedAt??null});
  if(!Array.isArray(snapshot.policies)||!Array.isArray(snapshot.functions)||!Array.isArray(snapshot.migrations)
    || !snapshot.schemaPrerequisites || typeof snapshot.schemaPrerequisites!=='object' || Array.isArray(snapshot.schemaPrerequisites)
    || !snapshot.planAuthority || typeof snapshot.planAuthority!=='object' || Array.isArray(snapshot.planAuthority))
    block('OFFICE_DB_SNAPSHOT_PARTIAL');
  const prerequisites=snapshot.schemaPrerequisites??{};
  if(prerequisites.participantTablePresent!==true)block('OFFICE_DB_PARTICIPANT_TABLE_MISSING');
  if(prerequisites.threadConversationTypePresent!==true)block('OFFICE_DB_CONVERSATION_TYPE_MISSING');
  if(prerequisites.privateCurrentUserReadHelperPresent!==true)block('OFFICE_DB_PRIVATE_CURRENT_USER_HELPER_MISSING');
  const planAuthority=snapshot.planAuthority??{};
  if(planAuthority.normalizedGrantTablePresent!==true||planAuthority.tenantSyncPresent!==true)
    block('OFFICE_DB_PLAN_AUTHORITY_MISSING');
  else if(planAuthority.tenantSyncUsesNormalizedGrants!==true)
    block('OFFICE_DB_PLAN_SYNC_AUTHORITY_DIVERGED');
  const policies=Array.isArray(snapshot.policies)?snapshot.policies:[];
  const functions=Array.isArray(snapshot.functions)?snapshot.functions:[];
  const migrations=Array.isArray(snapshot.migrations)?snapshot.migrations:[];
  for(const version of REQUIRED_OFFICE_MIGRATIONS){
    if(!migrations.some(m=>String(m?.version)===version))
      block('OFFICE_DB_MIGRATION_MISSING',{version});
  }
  if(!functions.some(f=>f?.schema==='public'&&f?.name==='can_read_office_thread_v1'))
    block('OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING');
  for(const table of OFFICE_TABLES){
    const scoped=policies.filter(p=>p?.schemaname==='public'&&p?.tablename===table&&visibleToAuthenticated(p)&&selectBearing(p));
    if(!scoped.length){block('OFFICE_DB_AUTHENTICATED_SELECT_POLICY_MISSING',{table});continue;}
    for(const policy of scoped){
      if(String(policy?.cmd).toUpperCase()==='ALL')
        block('OFFICE_DB_BROAD_ALL_POLICY',{table,policy:String(policy?.policyname??'')});
    }
    const permissive=scoped.filter(p=>String(p?.permissive??'').toUpperCase()==='PERMISSIVE');
    if(!permissive.length)block('OFFICE_DB_PERMISSIVE_READ_POLICY_MISSING',{table});
    // Existing current-auth.uid() helper remains essential to block nonmember reads.
    if(!permissive.some(p=>String(p.qual??'').includes('current_user_can_read_office_thread_v1')))
      block('OFFICE_DB_PARTICIPANT_POLICY_MISSING',{table});
    if(table==='office_tasks'&&!permissive.some(p=>String(p.qual??'').includes('can_manage_support')))
      block('OFFICE_DB_UNLINKED_TASK_SUPPORT_POLICY_MISSING',{table});
    const restrictive=scoped.filter(p=>String(p?.permissive??'').toUpperCase()==='RESTRICTIVE');
    const helper=table==='office_tasks'?'office_task_plan_allowed_v2':'office_thread_plan_allowed_v2';
    const expectedPredicate=table==='office_threads'
      ?'private.office_thread_plan_allowed_v2(instance_id,id)'
      : 'private.'+helper+'(instance_id,thread_id)';
    if(!restrictive.some(p=>p.policyname===table+'_plan_scoped_v2'
      && String(p.qual??'').replace(/\s+/g,'').includes(expectedPredicate.replace(/\s+/g,''))))
      block('OFFICE_DB_PLAN_SCOPED_RLS_MISSING',{table});
    for(const p of restrictive){
      if(isProGuard(p.qual))
        block('OFFICE_DB_ALAP_CUSTOMER_READ_BLOCKED',{table,policy:String(p.policyname??'')});
      if(!String(p.qual??'').replace(/\s+/g,'').includes(expectedPredicate.replace(/\s+/g,'')))
        block('OFFICE_DB_UNKNOWN_RESTRICTIVE_POLICY',{table,policy:String(p.policyname??'')});
    }
  }

  const getFn=(schema,name)=>functions.find(f=>f?.schema===schema&&f?.name===name);
  const fnText=(schema,name)=>String(getFn(schema,name)?.definition??'').toLowerCase().replace(/\s+/g,' ');
  const actor=getFn('public','can_read_office_thread_v1');
  if(!actor)block('OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING');
  if(actor?.authenticatedExecute!==false||actor?.anonExecute!==false)
    block('OFFICE_DB_BROWSER_ACTOR_RPC_EXPOSED');
  const readDef=fnText('public','can_read_office_thread_v1');
  const customerIdx=readDef.indexOf("if v_thread.conversation_type='customer'");
  const proIdx=readDef.indexOf("subscription_plan='pro'");
  if(customerIdx<0||proIdx<customerIdx
    ||!readDef.includes("officecommunication')")||!readDef.includes('can_manage_support')
    ||!readDef.includes("teamchat')")||!readDef.includes('office_active_participant_v1')
    ||!readDef.includes('evaluate_store_capability_v1'))
    block('OFFICE_DB_READ_FUNCTION_PLAN_SCOPE_INVALID');
  const featureDef=fnText('private','office_effective_feature_enabled_v1');
  if(!featureDef.includes('officecommunicationadvanced')||!featureDef.includes('teamchatsecureattachments')
    ||!featureDef.includes("v_plan is distinct from 'pro'")
    ||!featureDef.includes("when 'platform' then 500"))
    block('OFFICE_DB_ADVANCED_PRO_CAP_UNVERIFIED');
  const currentDef=fnText('private','current_user_can_read_office_thread_v1');
  if(!currentDef.includes('auth.uid()')||!currentDef.includes('can_read_office_thread_v1'))
    block('OFFICE_DB_CURRENT_USER_RLS_HELPER_INVALID');
  const threadDef=fnText('private','office_thread_plan_allowed_v2');
  if(!threadDef.includes('auth.uid()')||!threadDef.includes('can_read_office_thread_v1'))
    block('OFFICE_DB_THREAD_PLAN_HELPER_INVALID');
  const taskDef=fnText('private','office_task_plan_allowed_v2');
  if(!taskDef.includes('auth.uid()')||!taskDef.includes("officecommunication')")
    ||!taskDef.includes('can_manage_support')||!taskDef.includes('office_thread_plan_allowed_v2'))
    block('OFFICE_DB_TASK_PLAN_HELPER_INVALID');
  return{
    contract:'shoporation.office-db-readiness-report.v1',
    target:snapshot.target??null,
    capturedAt:snapshot.capturedAt??null,
    decision:findings.length?'BLOCK':'REVIEW',
    claim:findings.length?'DB_NOT_READY':'METADATA_CANDIDATE_ONLY',
    authoritative:false,
    requires:['canonical-source-lineage-proof','authenticated-role-behavioral-proof','tenant-plan-transition-proof','service-role-RPC-proof','migration-source-identity','current-Block11-plan-sync-compatibility'],
    findings,
  };
}

async function main(args){
  if(args.includes('--sql')){console.log(OFFICE_CATALOG_READONLY_SQL);return;}
  const at=args.indexOf('--snapshot');
  if(at<0||!args[at+1]){
    console.error(JSON.stringify(evaluateOfficeDbReadiness(null)));
    process.exitCode=2;
    return;
  }
  try{
    const value=JSON.parse(readFileSync(args[at+1],'utf8'));
    const result=evaluateOfficeDbReadiness(value);
    console.log(JSON.stringify(result,null,2));
    if(result.decision==='BLOCK')process.exitCode=1;
  }catch(error){
    console.error(JSON.stringify({contract:'shoporation.office-db-readiness-report.v1',decision:'BLOCK',claim:'NOT_VERIFIED',findings:[{code:'OFFICE_DB_SNAPSHOT_READ_FAILED',message:String(error?.message??error)}]}));
    process.exitCode=2;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void main(process.argv.slice(2));
