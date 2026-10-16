import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TENANT_IDS} from './shoperation-f6-u03n-tenant-role-rehearsal.mjs';
import {checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';

export const SCOPE='LOCAL_PG17_ANON_AND_FOREIGN_HELPER_ROLES_NOT_SIGNED_SUPABASE_JWT';
export const OUT='artifacts/f6-u03o/office-denials';
export const CASES=Object.freeze([
 {case:'A_customer',actor:TENANT_IDS.AUser,instance:TENANT_IDS.AStore,thread:TENANT_IDS.ACustomer,currentRead:true,threadPlan:true,taskPlan:true},
 {case:'A_internal',actor:TENANT_IDS.AUser,instance:TENANT_IDS.AStore,thread:TENANT_IDS.AInternal,currentRead:null,threadPlan:false,taskPlan:false},
 {case:'A_foreign_B',actor:TENANT_IDS.AUser,instance:TENANT_IDS.BStore,thread:TENANT_IDS.BCustomer,currentRead:false,threadPlan:false,taskPlan:false},
 {case:'A_mismatched_B',actor:TENANT_IDS.AUser,instance:TENANT_IDS.AStore,thread:TENANT_IDS.BCustomer,currentRead:false,threadPlan:false,taskPlan:false},
 {case:'B_customer',actor:TENANT_IDS.BUser,instance:TENANT_IDS.BStore,thread:TENANT_IDS.BCustomer,currentRead:true,threadPlan:true,taskPlan:true},
 {case:'B_private',actor:TENANT_IDS.BUser,instance:TENANT_IDS.BStore,thread:TENANT_IDS.BInternal,currentRead:true,threadPlan:true,taskPlan:true},
 {case:'B_foreign_A',actor:TENANT_IDS.BUser,instance:TENANT_IDS.AStore,thread:TENANT_IDS.ACustomer,currentRead:false,threadPlan:false,taskPlan:false},
 {case:'unknown_A',actor:TENANT_IDS.Stranger,instance:TENANT_IDS.AStore,thread:TENANT_IDS.ACustomer,currentRead:false,threadPlan:false,taskPlan:false},
 {case:'unknown_B',actor:TENANT_IDS.Stranger,instance:TENANT_IDS.BStore,thread:TENANT_IDS.BInternal,currentRead:false,threadPlan:false,taskPlan:false}
]);
const fail=m=>{throw Error(m)};
const rows=['office_threads','office_messages','office_tasks'];
export function buildNativeDenialSQL(){
 const anon=[
  'BEGIN;',
  'SET LOCAL ROLE anon;',
  "SELECT 'F6U03O_ANON_ROLE='||jsonb_build_object('role',current_user,'uid',auth.uid(),"+
  "'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user))::text;",
  'DO $f6o$',
  'DECLARE c bigint; state text;',
  'BEGIN',
  ...rows.flatMap(table=>[
    '  BEGIN',
    '    SELECT count(*) INTO c FROM public.'+table+';',
    "    state := CASE WHEN c=0 THEN 'zero_rows' ELSE 'visible_rows' END;",
    '  EXCEPTION WHEN insufficient_privilege THEN',
    "    state := 'permission_denied'; c:=NULL;",
    '  END;',
    "  RAISE NOTICE 'F6U03O_ANON_TABLE=%',jsonb_build_object('table','"+table+
    "','result',state,'visible',c)::text;"
  ]),
  'END $f6o$;',
  'ROLLBACK;'
 ];
 const helper=CASES.flatMap(c=>[
  'BEGIN;',
  'SET LOCAL ROLE authenticated;',
  "SELECT set_config('request.jwt.claim.sub','"+c.actor+"',true);",
  "SELECT set_config('request.jwt.claim.role','authenticated',true);",
  "SELECT 'F6U03O_HELPER='||jsonb_build_object("+
    "'case','"+c.case+"','role',current_user,'uid',auth.uid(),"+
    "'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),"+
    "'currentRead',private.current_user_can_read_office_thread_v1('"+c.instance+"'::uuid,'"+c.thread+"'::uuid),"+
    "'threadPlan',private.office_thread_plan_allowed_v2('"+c.instance+"'::uuid,'"+c.thread+"'::uuid),"+
    "'taskPlan',private.office_task_plan_allowed_v2('"+c.instance+"'::uuid,'"+c.thread+"'::uuid))::text;",
  'ROLLBACK;'
 ]);
 return [...anon,...helper].join('\n')+'\n';
}
export function validateNativeDenials(log){
 if(typeof log!=='string'||!log.includes('F6U03O_ANON_ROLE='))
   fail('F6U03O_NATIVE_ROLE_EVIDENCE_MISSING');
 const extract=(prefix)=>{
   const matches=[...log.matchAll(new RegExp(prefix+'(\\{[^\\r\\n]*\\})','g'))];
   return matches.map(m=>JSON.parse(m[1]));
 };
 const roles=extract('F6U03O_ANON_ROLE='),anon=extract('F6U03O_ANON_TABLE='),helpers=extract('F6U03O_HELPER=');
 if(roles.length!==1||roles[0].role!=='anon'||roles[0].uid!==null||roles[0].bypass!==false)
   fail('F6U03O_ANONYMOUS_ROLE_NOT_AUTHENTIC');
 if(anon.length!==rows.length||new Set(anon.map(x=>x.table)).size!==rows.length||
    anon.some(x=>!rows.includes(x.table)||!['permission_denied','zero_rows'].includes(x.result)||
      (x.result==='zero_rows'&&x.visible!==0)||(x.result==='permission_denied'&&x.visible!==null)))
   fail('F6U03O_ANONYMOUS_OFFICE_ROW_EXPOSURE');
 if(helpers.length!==CASES.length||new Set(helpers.map(x=>x.case)).size!==CASES.length)
   fail('F6U03O_HELPER_POSITIVE_OR_NEGATIVE_MISSING');
 for(const spec of CASES){
   const x=helpers.find(z=>z.case===spec.case);
   if(!x||x.role!=='authenticated'||x.bypass!==false||x.uid!==spec.actor||
      typeof x.currentRead!=='boolean'||typeof x.threadPlan!=='boolean'||typeof x.taskPlan!=='boolean'||
      (spec.currentRead!==null&&x.currentRead!==spec.currentRead)||
      x.threadPlan!==spec.threadPlan||x.taskPlan!==spec.taskPlan)
     fail('F6U03O_CROSS_TENANT_OR_ALAP_HELPER_DENIAL_FAILED:'+spec.case);
 }
 return {decision:'LOCAL_PG17_ANON_FOREIGN_HELPER_DENIAL_VERIFIED_NOT_SIGNED_JWT',
   scope:SCOPE,originalSqlSourceCount:78,anonRelationCases:anon.length,
   anonDeniedByAcl:anon.filter(x=>x.result==='permission_denied').length,
   anonZeroRows:anon.filter(x=>x.result==='zero_rows').length,
   authenticatedDirectHelperCases:helpers.length,positiveTenantHelperCases:3,
   crossTenantAndUnauthorizedDenialCases:5,alapInternalPlanDenied:true,
   genuineSignedSupabaseJwtProven:false,managedDataApiProven:false,
   syntheticJwt:true,hostedTouched:false,releaseAuthorized:false};
}
function cli(){
 const [mode,path]=process.argv.slice(2);
 if(process.argv.length!==4||resolve(path||'')!==resolve(OUT))
   fail('F6U03O_LOCAL_ARTIFACT_ONLY');
 mkdirSync(resolve(OUT),{recursive:true});
 if(mode==='--emit-denial-query'){
   const n=JSON.parse(readFileSync('artifacts/f6-u03n/two-tenant-local/tenant-role-evidence.json','utf8'));
   const manifest=JSON.parse(readFileSync('artifacts/f6-u03n/two-tenant-local/candidate.json','utf8'));
   if(n.decision!=='LOCAL_PG17_TWO_TENANT_SIMULATED_JWT_RLS_VERIFIED_NOT_HOSTED'||
      n.localTenantPositiveNegativeProven!==true||n.signedSupabaseJwtProven!==false||
      checkCandidateManifest(manifest)!==true)fail('F6U03O_POSITIVE_SOURCE_TENANT_PROOF_REQUIRED');
   writeFileSync(join(resolve(OUT),'role-denials.sql'),buildNativeDenialSQL());return;
 }
 if(mode==='--assess-denials'){
   const log=readFileSync(join(resolve(OUT),'native-denial.log'),'utf8');
   const result=validateNativeDenials(log);
   writeFileSync(join(resolve(OUT),'denial-proof.json'),JSON.stringify(result,null,2)+'\n');
   console.log(JSON.stringify(result));return;
 }
 fail('F6U03O_HOSTED_EXECUTION_NOT_AUTHORIZED');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1;}
}
