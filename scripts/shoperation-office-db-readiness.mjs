import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const OFFICE_TABLES=Object.freeze(['office_threads','office_messages','office_tasks']);
export const REQUIRED_OFFICE_MIGRATIONS=Object.freeze([
  '20260908022500', // customer/private Office read RLS foundation
  '20260908023000', // membership hardening
  '20260908024000', // function exposure closure
  '20260909204825', // Alap/Pro Team Chat split
  '20260910061815', // Alap ordinary email / Pro advanced Office split
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
   'args',pg_get_function_identity_arguments(p.oid)))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private')
   and p.proname in ('can_read_office_thread_v1','office_pro_plan_allowed_v1')),'[]'::jsonb),
 'migrations',coalesce((select jsonb_agg(jsonb_build_object(
   'version',version,'name',name))
   from supabase_migrations.schema_migrations),'[]'::jsonb)
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
  if(!Array.isArray(snapshot.policies)||!Array.isArray(snapshot.functions)||!Array.isArray(snapshot.migrations))
    block('OFFICE_DB_SNAPSHOT_PARTIAL');
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
    // The participant-aware helper must remain part of ordinary SELECT access.
    if(!permissive.some(p=>String(p.qual??'').includes('can_read_office_thread_v1')))
      block('OFFICE_DB_PARTICIPANT_POLICY_MISSING',{table});
    // A dedicated RESTRICTIVE Pro subscription policy may protect every
    // permissive SELECT policy; otherwise each permissive policy needs its own
    // Pro predicate, since permissive policies combine with OR semantics.
    const restrictivePro=scoped.some(p=>String(p.permissive??'').toUpperCase()==='RESTRICTIVE'&&isProGuard(p.qual));
    if(!restrictivePro&&permissive.some(p=>!isProGuard(p.qual)))
      block('OFFICE_DB_PRO_SUBSCRIPTION_RLS_MISSING',{table});
  }
  const functionNames=new Set(functions.filter(f=>f?.schema==='private'||f?.schema==='public').map(f=>f?.name));
  if(policies.some(p=>/office_pro_plan_allowed_v1\s*\(/i.test(String(p?.qual??'')))&&!functionNames.has('office_pro_plan_allowed_v1'))
    block('OFFICE_DB_PRO_PLAN_HELPER_MISSING');
  return{
    contract:'shoporation.office-db-readiness-report.v1',
    target:snapshot.target??null,
    capturedAt:snapshot.capturedAt??null,
    decision:findings.length?'BLOCK':'REVIEW',
    claim:findings.length?'DB_NOT_READY':'METADATA_CANDIDATE_ONLY',
    authoritative:false,
    requires:['authenticated-role-behavioral-proof','tenant-plan-transition-proof','service-role-RPC-proof','migration-source-identity'],
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
