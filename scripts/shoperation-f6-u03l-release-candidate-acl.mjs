import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {composeOriginalSourceDiagnostic} from './shoperation-f6-u03k-office-local-replay.mjs';
import {REVIEWED_SOURCE_COMMIT,validateReviewedBaseline} from './shoperation-disposable-fresh-replay.mjs';

export const CONTRACT='shoporation.f6-u03l.ordered-source-review-candidate.v0';
export const SCOPE='ORIGINAL_78_SOURCE_REVIEW_CANDIDATE_NOT_A_RELEASE';
export const OUTPUT='artifacts/f6-u03l/review-candidate-v0';
export const PRODUCTION_EXECUTION_AUTHORIZED=false;
export const V2='public.record_inbound_office_email_v2(text,text,text,text,text)';
export const V3='public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)';
const fail=x=>{throw new Error(x);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const gitBlob=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const gitTree=(root,commit,path)=>{
 const output=execFileSync('git',['ls-tree',commit,'--',path],
  {cwd:root,encoding:'utf8',timeout:15000}).trim();
 const match=/^100644 blob ([0-9a-f]{40})\b/.exec(output);
 if(!match)fail('F6U03L_SOURCE_GIT_TREE_MISSING:'+path);
 return match[1];
};
const mark=/^-- (F6U03I_ORIGINAL_SOURCE|F6U03K_PINNED_ORIGINAL_MAIN_SOURCE) (.+\.sql)$/gm;
export function checkCandidateManifest(m){
 if(!m||m.contract!==CONTRACT||m.scope!==SCOPE||m.version!=='v0.1'||
    m.releaseAuthorized!==false||m.hostedTouched!==false||m.providerManagedAuthStorageProven!==false||
    m.signedInAlapProRlsProven!==false||m.executedAsRelease!==false)
  fail('F6U03L_CANDIDATE_NOT_PRODUCTION_AUTHORITY');
 if(!Array.isArray(m.sources)||m.sources.length!==78||
    m.sources.filter(x=>x.authority==='reviewed-customer-baseline').length!==59||
    m.sources.filter(x=>x.authority==='original-main-office-history').length!==19||
    new Set(m.sources.map(x=>x.path)).size!==78||
    m.sources.some((x,i)=>x.ordinal!==i+1||!/^[0-9a-f]{40}$/.test(x.gitBlob)||
       !/^[0-9a-f]{64}$/.test(x.sha256)))
  fail('F6U03L_SOURCE_COUNT_OR_PROVENANCE_DRIFT');
 const idx=needle=>m.sources.findIndex(x=>x.path.endsWith(needle));
 const a=idx('20260903180000_inbound_office_email_atomic_v2.sql');
 const b=idx('20260908030000_digital_office_real_inbound_foundation_v1.sql');
 const c=idx('0055_communication_hub_2_0_foundation_v1.sql');
 const d=idx('0057_communication_hub_2_0_advanced_guards_and_object_links_v1.sql');
 const e=idx('20260910070300_communication_hub_2_0_fk_indexes_v1.sql');
 const f=idx('0058_digital_office_plan_scoped_sql_guard_v2.sql');
 if([a,b,c,d,e,f].some(x=>x<0)||!(a<b&&b<c&&c<d&&d<e&&e<f)||
    m.sources.slice(0,c).filter(x=>x.authority==='original-main-office-history').length!==18||
    m.sources.slice(e+1).some(x=>x.authority==='original-main-office-history'))
  fail('F6U03L_ORDERED_ORIGINAL_DEPENDENCY_INVALID');
 return true;
}
export function buildCandidateManifest({root=process.cwd()}={}){
 const original=composeOriginalSourceDiagnostic({root,mode:'commit'});
 const baseline=validateReviewedBaseline(root);
 if(original.manifest.uniqueOriginalFiles!==78||original.manifest.extraOriginalCount!==19||
    original.manifest.predecessorBefore0055Count!==18||
    original.manifest.followupAfter0057Count!==1||
    baseline.sourceSetSha256!==original.manifest.approved59SourceSha256||
    original.manifest.releaseAuthorized!==false)
  fail('F6U03L_ORIGINAL_SOURCE_PROOF_REQUIRED');
 const markers=[...original.sql.matchAll(mark)].map(x=>({kind:x[1],path:x[2]}));
 if(markers.length!==78)fail('F6U03L_78_SOURCE_MARKERS_REQUIRED');
 const known59=new Set(baseline.migrationFiles);
 const extra=new Map(original.manifest.extraSourcePaths.map((path,i)=>[path,original.manifest.extraGitBlobs[i]]));
 const sources=markers.map((x,i)=>{
  const authority=x.kind==='F6U03I_ORIGINAL_SOURCE'?'reviewed-customer-baseline':'original-main-office-history';
  const commit=authority==='reviewed-customer-baseline'?REVIEWED_SOURCE_COMMIT:original.manifest.authorityMain;
  if(authority==='reviewed-customer-baseline'?!known59.has(x.path):!extra.has(x.path))
   fail('F6U03L_UNKNOWN_ORIGINAL_SOURCE:'+x.path);
  const bytes=readFileSync(resolve(root,x.path));
  const blob=gitBlob(bytes);
  if(blob!==gitTree(root,commit,x.path)||
      authority==='original-main-office-history'&&blob!==extra.get(x.path))
   fail('F6U03L_ORIGINAL_GIT_BLOB_DRIFT:'+x.path);
  return {ordinal:i+1,path:x.path,authority,sourceCommit:commit,gitBlob:blob,sha256:sha(bytes)};
 });
 const payload={
  contract:CONTRACT,version:'v0.1',scope:SCOPE,
  authority:'SOURCE_VERIFIED_CANDIDATE_ONLY',
  sources,original59SourceSetSha256:baseline.sourceSetSha256,
  originalLocalSqlSha256:original.manifest.sourceSqlSha256,
  releaseAuthorized:false,hostedTouched:false,executedAsRelease:false,
  productionSqlGenerated:false,providerManagedAuthStorageProven:false,signedInAlapProRlsProven:false,
  originalTargetPreflightAndPostflightPresent:true,localPg17CommitAndRollbackPreviouslyProven:true,
  knownOpenAcceptance:['legacy and Office-wide ACL/RLS supersession review','managed Supabase provider proof','signed-in Alap/Pro tenant JWT/RLS','TLS-bound hosted target and restore proof','PO release-package approval']
 };
 checkCandidateManifest(payload);
 return {...payload,candidateSha256:sha(JSON.stringify(payload))};
}
export function buildFinalAclProbe(){
 return [
 '-- F6-U03l strictly read-only post-COMMIT effective ACL; Docker PG17 only',
 'WITH targets(version,signature) AS (',
 " VALUES ('v2','public.record_inbound_office_email_v2(text,text,text,text,text)'),",
 "        ('v3','public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)')",
 '), f AS (',
 ' SELECT t.version,t.signature,to_regprocedure(t.signature) AS func_oid FROM targets t',
 '), grants AS (',
 ' SELECT f.version,f.signature,f.func_oid IS NOT NULL AS function_exists,',
 '        p.prosecdef AS security_definer,',
 "        has_function_privilege('anon',f.func_oid,'EXECUTE') AS anon,",
 "        has_function_privilege('authenticated',f.func_oid,'EXECUTE') AS authenticated,",
 "        has_function_privilege('service_role',f.func_oid,'EXECUTE') AS service_role,",
 "        EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) AS a",
 "                 WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute",
 ' FROM f LEFT JOIN pg_proc p ON p.oid=f.func_oid',
 ') SELECT jsonb_build_object(',
 " 'contract','shoporation.f6-u03l.native-pg17-final-function-acl.v1',",
 " 'rows',jsonb_agg(jsonb_build_object('version',version,'signature',signature,",
 "   'exists',function_exists,'securityDefiner',security_definer,",
 "   'anon',anon,'authenticated',authenticated,'serviceRole',service_role,",
 "   'publicExecute',public_execute) ORDER BY version)",
 ')::text FROM grants;'
 ].join('\n')+'\n';
}
export function validateFinalAcl(x){
 if(!x||x.contract!=='shoporation.f6-u03l.native-pg17-final-function-acl.v1'||
    !Array.isArray(x.rows)||x.rows.length!==2)
  fail('F6U03L_NOT_REAL_NATIVE_ACL_RESULT');
 const v2=x.rows.find(r=>r.version==='v2'),v3=x.rows.find(r=>r.version==='v3');
 if(!v2||!v3||v2.signature!==V2||v3.signature!==V3||
    v2.exists!==true||v3.exists!==true||
    v2.securityDefiner!==true||v3.securityDefiner!==true||
    v2.publicExecute!==false||v3.publicExecute!==false||
    v2.anon!==false||v2.authenticated!==false||v2.serviceRole!==false||
    v3.anon!==false||v3.authenticated!==false||v3.serviceRole!==true)
  fail('F6U03L_LEGACY_OR_BROWSER_EXECUTE_PRIVILEGE_DRIFT');
 return {scope:SCOPE,decision:'LOCAL_NATIVE_ACL_VERIFIED_NOT_RELEASE',
  v2DeniedToAllRuntimeRoles:true,v3ServiceRoleOnly:true,
  releaseAuthorized:false,hostedTouched:false,
  managedProviderProven:false,authenticatedTenantRlsProven:false};
}
function cli(){
 const [operation,target]=process.argv.slice(2);
 if(operation!=='--emit-candidate'||process.argv.length!==4||
    resolve(target||'')!==resolve(OUTPUT))
  fail('F6U03L_UNAUTHORIZED_CANDIDATE_OR_HOSTED_CLI');
 const m=buildCandidateManifest();
 mkdirSync(resolve(OUTPUT),{recursive:true});
 writeFileSync(join(resolve(OUTPUT),'ordered-candidate-v0.1.json'),JSON.stringify(m,null,2)+'\n');
 writeFileSync(join(resolve(OUTPUT),'final-acl-readonly.sql'),buildFinalAclProbe());
 console.log(JSON.stringify({candidate:m.version,items:m.sources.length,hash:m.candidateSha256,
  releaseAuthorized:false,hostedTouched:false,sqlExecution:false}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1;}
}
