import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TENANT_IDS} from './shoperation-f6-u03n-tenant-role-rehearsal.mjs';
import {checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';

export const SCOPE='LOCAL_PG17_ROLE_PARTICIPANT_ENTITLEMENT_LIFECYCLE_NOT_SIGNED_JWT';
export const OUT='artifacts/f6-u03p/lifecycle-rls';
const T={...TENANT_IDS,Support:'bbbbbbbb-0000-4000-8000-000000000004',Viewer:'bbbbbbbb-0000-4000-8000-000000000005'};
const A=[T.ACustomer], B=[T.BCustomer,T.BInternal].sort();
const actor=(label,uid,expected)=>({label,uid,expected:[...expected].sort()});
export const SCENARIOS=Object.freeze([
 {name:'same_store_support_nonparticipant',mutation:null,probes:[
  actor('support_customer_only',T.Support,[T.BCustomer]),actor('participating_owner',T.BUser,B)]},
 {name:'same_store_viewer',mutation:null,probes:[
  actor('viewer_no_office',T.Viewer,[]),actor('support_owner_control',T.BUser,B)]},
 {name:'left_private_thread',mutation:"UPDATE public.office_thread_participants SET left_at=now(),updated_at=now() WHERE instance_id='"+T.BStore+"'::uuid AND thread_id='"+T.BInternal+"'::uuid AND user_id='"+T.BUser+"'::uuid AND left_at IS NULL;",probes:[
  actor('owner_after_leave',T.BUser,[T.BCustomer]),actor('other_tenant_customer_control',T.AUser,A)]},
 {name:'role_revoked',mutation:"UPDATE public.role_bindings SET revoked_at=now() WHERE instance_id='"+T.BStore+"'::uuid AND user_id='"+T.BUser+"'::uuid AND role_code='owner' AND revoked_at IS NULL;",probes:[
  actor('revoked_owner',T.BUser,[]),actor('active_A_owner_control',T.AUser,A)]},
 {name:'role_expired',mutation:"UPDATE public.role_bindings SET valid_from=now()-interval '2 days',valid_until=now()-interval '1 day' WHERE instance_id='"+T.BStore+"'::uuid AND user_id='"+T.BUser+"'::uuid AND role_code='owner' AND revoked_at IS NULL;",probes:[
  actor('expired_owner',T.BUser,[]),actor('active_A_owner_control',T.AUser,A)]},
 {name:'alap_customer_entitlement_expired',mutation:"UPDATE public.feature_entitlements SET valid_from=now()-interval '2 days',valid_until=now()-interval '1 day' WHERE instance_id='"+T.AStore+"'::uuid AND feature_code='officeCommunication' AND enabled=true;",probes:[
  actor('A_expired_customer_entitlement',T.AUser,[]),actor('B_pro_unchanged_control',T.BUser,B)]},
 {name:'pro_to_alap_downgrade',mutation:"UPDATE public.webshop_instances SET subscription_plan='alap' WHERE id='"+T.BStore+"'::uuid AND subscription_plan='pro';",probes:[
  actor('B_downgraded_customer_only',T.BUser,[T.BCustomer]),actor('A_alap_customer_control',T.AUser,A)]}
]);
const fail=m=>{throw Error(m)};
const allIds=[T.ACustomer,T.AInternal,T.BCustomer,T.BInternal];
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const roleGuard="IF current_database()<>'f6_u03i_fresh' OR current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17 THEN RAISE EXCEPTION 'F6U03P_WRONG_OR_HOSTED_TARGET'; END IF;";
export function buildLifecycleSQL(){
 const fixture=[
  'BEGIN;',
  'DO $f6p$ BEGIN '+roleGuard+
   " IF (SELECT count(*) FROM public.office_threads WHERE id IN ("+allIds.map(quote).join(',')+"))<>4"+
   " OR (SELECT count(*) FROM public.office_messages WHERE thread_id IN ("+allIds.map(quote).join(',')+"))<>4"+
   " OR (SELECT count(*) FROM public.office_tasks WHERE thread_id IN ("+allIds.map(quote).join(',')+"))<>4"+
   " THEN RAISE EXCEPTION 'F6U03P_POSITIVE_ORIGINAL_FIXTURE_MISSING'; END IF; END $f6p$;",
  'INSERT INTO auth.users(id,email) VALUES ('+quote(T.Support)+",'b-support@f6p.invalid'),("+quote(T.Viewer)+",'b-viewer@f6p.invalid');",
  'INSERT INTO public.role_bindings(organization_id,instance_id,user_id,role_code) VALUES ('+
  [T.BOrg,T.BStore,T.Support,'support'].map(quote).join(',')+'),('+
  [T.BOrg,T.BStore,T.Viewer,'viewer'].map(quote).join(',')+');',
  'COMMIT;'
 ];
 const cases=SCENARIOS.flatMap(s=>{
  const pre=['BEGIN;','DO $f6p$ BEGIN '+roleGuard+' END $f6p$;'];
  if(s.mutation)pre.push("DO $f6p$ DECLARE affected bigint; BEGIN "+s.mutation+
    " GET DIAGNOSTICS affected=ROW_COUNT; IF affected<1 THEN RAISE EXCEPTION 'F6U03P_MUTATION_FIXTURE_MISSING:"+s.name+"'; END IF; END $f6p$;");
  pre.push('SET LOCAL ROLE authenticated;');
  for(const probe of s.probes){
   pre.push("SELECT set_config('request.jwt.claim.sub',"+quote(probe.uid)+',true);');
   pre.push("SELECT set_config('request.jwt.claim.role','authenticated',true);");
   pre.push("SELECT 'F6U03P_CASE='||jsonb_build_object("+
    "'scenario',"+quote(s.name)+",'label',"+quote(probe.label)+
    ",'role',current_user,'uid',auth.uid(),'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),"+
    "'threads',(SELECT coalesce(jsonb_agg(id::text ORDER BY id),'[]'::jsonb) FROM public.office_threads),"+
    "'messages',(SELECT coalesce(jsonb_agg(thread_id::text ORDER BY thread_id),'[]'::jsonb) FROM public.office_messages),"+
    "'tasks',(SELECT coalesce(jsonb_agg(thread_id::text ORDER BY thread_id),'[]'::jsonb) FROM public.office_tasks))::text;");
  }
  pre.push('ROLLBACK;');
  return pre;
 });
 return [...fixture,...cases].join('\n')+'\n';
}
export function validateLifecycleEvidence(log){
 if(typeof log!=='string')fail('F6U03P_NATIVE_LOG_REQUIRED');
 const rows=log.split('\n').filter(s=>s.startsWith('F6U03P_CASE=')).map(line=>{
  try{return JSON.parse(line.slice('F6U03P_CASE='.length))}catch{fail('F6U03P_INVALID_NATIVE_ROW_JSON')}
 });
 const expectedCount=SCENARIOS.reduce((n,s)=>n+s.probes.length,0);
 if(rows.length!==expectedCount)fail('F6U03P_MISSING_POSITIVE_OR_NEGATIVE_CONTROL');
 const seen=new Set();
 for(const s of SCENARIOS){
  if(s.probes.length!==2||!s.probes.some(p=>p.expected.length>0)||!s.probes.some(p=>p.expected.length<2))
   fail('F6U03P_NO_BOUND_POSITIVE_NEGATIVE_PAIR:'+s.name);
  for(const spec of s.probes){
   const key=s.name+'/'+spec.label;
   if(seen.has(key))fail('F6U03P_DUPLICATE_SPEC');seen.add(key);
   const matches=rows.filter(x=>x.scenario===s.name&&x.label===spec.label);
   if(matches.length!==1)fail('F6U03P_PROBE_MISSING_OR_DUPLICATED:'+key);
   const x=matches[0];
   if(x.role!=='authenticated'||x.bypass!==false||x.uid!==spec.uid)
    fail('F6U03P_NOT_AUTHENTICATED_NATIVE_ROLE:'+key);
   for(const relation of ['threads','messages','tasks']){
    if(!Array.isArray(x[relation])||x[relation].some(v=>!allIds.includes(v))||
     JSON.stringify(x[relation])!==JSON.stringify(spec.expected))
     fail('F6U03P_OFFICE_ROW_RLS_LEAK_OR_MISSING_POSITIVE:'+key+':'+relation);
   }
  }
 }
 return {decision:'LOCAL_PG17_ROLE_LIFECYCLE_RLS_VERIFIED_NOT_SIGNED_JWT',
  scope:SCOPE,originalSqlSourceCount:78,scenarioCount:SCENARIOS.length,
  authenticatedNativeRoleProbeCases:expectedCount,relationsVerified:['office_threads','office_messages','office_tasks'],
  sameTenantNonparticipantDenied:true,viewerDenied:true,privateLeaveRevocationDenied:true,
  roleRevocationAndExpiryDenied:true,entitlementExpiryDenied:true,alapCustomerDowngradePreserved:true,
  positiveAndNegativeControlsRequired:true,syntheticJwt:true,genuineSignedSupabaseJwtProven:false,
  managedDataApiProven:false,managedStorageProven:false,hostedTouched:false,releaseAuthorized:false};
}
function cli(){
 const [mode,path]=process.argv.slice(2);
 if(process.argv.length!==4||resolve(path||'')!==resolve(OUT))fail('F6U03P_LOCAL_ARTIFACT_ONLY');
 mkdirSync(resolve(OUT),{recursive:true});
 if(mode==='--emit-lifecycle-sql'){
  const manifest=JSON.parse(readFileSync('artifacts/f6-u03n/two-tenant-local/candidate.json','utf8'));
  const n=JSON.parse(readFileSync('artifacts/f6-u03n/two-tenant-local/tenant-role-evidence.json','utf8'));
  const o=JSON.parse(readFileSync('artifacts/f6-u03o/office-denials/denial-proof.json','utf8'));
  if(checkCandidateManifest(manifest)!==true||
     n.decision!=='LOCAL_PG17_TWO_TENANT_SIMULATED_JWT_RLS_VERIFIED_NOT_HOSTED'||
     n.localTenantPositiveNegativeProven!==true||n.signedSupabaseJwtProven!==false||
     o.decision!=='LOCAL_PG17_ANON_FOREIGN_HELPER_DENIAL_VERIFIED_NOT_SIGNED_JWT'||
     o.genuineSignedSupabaseJwtProven!==false||o.hostedTouched!==false)
   fail('F6U03P_ORIGINAL_SOURCE_AND_POSITIVE_CONTROL_REQUIRED');
  writeFileSync(join(resolve(OUT),'role-lifecycle.sql'),buildLifecycleSQL());return;
 }
 if(mode==='--assess-lifecycle'){
  const result=validateLifecycleEvidence(readFileSync(join(resolve(OUT),'native-lifecycle.log'),'utf8'));
  writeFileSync(join(resolve(OUT),'lifecycle-proof.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 fail('F6U03P_HOSTED_EXECUTION_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
