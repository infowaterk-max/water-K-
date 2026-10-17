import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildBoundOriginalForwardSource,PROJECT_REF,SOURCE_78_SHA256} from './shoperation-f6-u03s-forward-release-readiness.mjs';
import {TRANSACTION_GUARD_SQL,compileReviewGuard} from './shoperation-f6-u03f-target-transaction-guard.mjs';

export const CONTRACT='shoporation.f6-u03w.executable-office-forward-candidate.v1';
export const OUTPUT='artifacts/f6-u03w/office-forward-candidate';
export const HOSTED_EXECUTION_AUTHORIZED=false;
export const ORIGINAL_FORWARD_COUNT=31;
const sha=data=>createHash('sha256').update(data).digest('hex');
const fail=id=>{throw Error('F6U03W_'+id)};
const PATH=/^supabase\/(?:customer-baseline\/migrations\/\d{4}_[a-z0-9_]+|migrations\/\d{14}_[a-z0-9_]+)\.sql$/;
const END_MARK='-- F6-U03w: signed-source ordered Office forward end';
const PREFIX=[
 'BEGIN;',
 "SET LOCAL lock_timeout='3s';",
 "SET LOCAL statement_timeout='10min';",
 '-- F6-U03w locked 0046 and provider state recheck follows.',
].join('\n')+'\n';
const AFTER=[
 '-- F6-U03w: independent bounded schema postconditions inside same transaction.',
 'DO $f6u03w_after$',
 'BEGIN',
 " IF to_regclass('public.office_thread_participants') IS NULL THEN",
 "  RAISE EXCEPTION 'F6U03W_PARTICIPANTS_MISSING'; END IF;",
 " IF to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') IS NULL THEN",
 "  RAISE EXCEPTION 'F6U03W_OFFICE_PRIVACY_HELPER_MISSING'; END IF;",
 " IF to_regprocedure('private.office_effective_feature_enabled_v1(uuid,text)') IS NULL THEN",
 "  RAISE EXCEPTION 'F6U03W_OFFICE_PLAN_HELPER_MISSING'; END IF;",
 " IF (SELECT count(*) FROM pg_catalog.pg_policies",
 "     WHERE schemaname='public' AND tablename IN('office_threads','office_messages','office_tasks')",
 "       AND policyname IN('office_threads_plan_scoped_v2','office_messages_plan_scoped_v2','office_tasks_plan_scoped_v2'))<>3 THEN",
 "  RAISE EXCEPTION 'F6U03W_PLAN_SCOPED_POLICY_SET_MISSING'; END IF;",
 " IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM public.webshop_instances) THEN",
 "  RAISE EXCEPTION 'F6U03W_UNEXPECTED_AUTH_OR_TENANT_AFTER_MIGRATION'; END IF;",
 " IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations) THEN",
 "  RAISE EXCEPTION 'F6U03W_HISTORY_MUTATION_FORBIDDEN'; END IF;",
 'END',
 '$f6u03w_after$;',
 END_MARK,
 'COMMIT;'
].join('\n')+'\n';

export function sourceBoundOfficeBundle({original=buildBoundOriginalForwardSource(),
 guardSql=TRANSACTION_GUARD_SQL,readSource=p=>readFileSync(resolve(p))}={}){
 if(!original||original.sourceSetSha256!==SOURCE_78_SHA256||
  original.forwardCount!==ORIGINAL_FORWARD_COUNT||original.originalCount!==78||
  original.hostedExecutionAuthorized!==false||original.originalGitSourceVerified!==true||
  !Array.isArray(original.paths)||original.paths.length!==ORIGINAL_FORWARD_COUNT)
  fail('ORIGINAL_78_SOURCE_AUTHORITY_INVALID');
 const guard=compileReviewGuard();
 if(guard.hostedExecutionEnabled!==false||guard.projectRef!==PROJECT_REF||
  typeof guardSql!=='string'||guard.sqlSha256!==sha(guardSql)||
  !guardSql.startsWith('DO $f6_guard$')||!guardSql.includes('ACCESS EXCLUSIVE MODE NOWAIT')||
  !guardSql.includes("e312b40ad91150ce937f4aa00db587f3")||
  !guardSql.includes('F6U03F_APPLICATION_USER_DATA_PRESENT')||
  !guardSql.includes('F6U03F_APPLICATION_SCHEMA_HASH_DRIFT'))
  fail('PINNED_0046_TRANSACTION_GUARD_DRIFT');
 const statements=[],sources=[];
 const unique=new Set();
 for(const [i,s] of original.paths.entries()){
  if(!s||!PATH.test(s.path)||!Number.isInteger(s.ordinal)||s.ordinal!==i+48||
     typeof s.sha256!=='string'||!/^[0-9a-f]{64}$/.test(s.sha256)||
     typeof s.gitBlob!=='string'||!/^[0-9a-f]{40}$/.test(s.gitBlob)||
     unique.has(s.path))fail('ORDERED_SOURCE_IDENTITY_DRIFT');
  unique.add(s.path);
  let data;try{data=readSource(s.path)}catch{fail('ORIGINAL_SOURCE_UNREADABLE')}
  if(!(Buffer.isBuffer(data)||typeof data==='string'))fail('SOURCE_BYTES_REQUIRED');
  const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);
  if(sha(bytes)!==s.sha256||bytes.length<200)
   fail('ORIGINAL_SQL_BYTES_SHA_DRIFT');
  const body=bytes.toString('utf8');
  if(body.includes('\0')||!body.trim()||body.includes(END_MARK))fail('SQL_SOURCE_CONTAMINATION');
  // Every original file remains byte-identical. This is an execution package,
  // not a reimplementation or source rewrite.
  statements.push('-- F6-U03w ORIGINAL #'+(i+1)+' '+s.path+' sha256='+s.sha256+'\n'+body.trimEnd()+'\n');
  sources.push({ordinal:s.ordinal,path:s.path,sha256:s.sha256,gitBlob:s.gitBlob,sourceCommit:s.sourceCommit});
 }
 if(!sources[0].path.endsWith('/0047_team_permissions_foundation_v1.sql')||
    !sources.at(-1).path.endsWith('/0058_digital_office_plan_scoped_sql_guard_v2.sql'))
  fail('OFFICE_FORWARD_BOUNDARIES_CHANGED');
 const bundle=PREFIX+guardSql.trimEnd()+'\n'+statements.join('\n')+AFTER;
 if(bundle.indexOf(END_MARK)<bundle.indexOf('0047_team_permissions_foundation_v1.sql')||
    !bundle.startsWith('BEGIN;\n')||!bundle.endsWith('COMMIT;\n'))
  fail('TRANSACTION_BOUNDARY_INVALID');
 const manifest=Object.freeze({
  contract:CONTRACT,projectRef:PROJECT_REF,sourceSetSha256:SOURCE_78_SHA256,
  sourceCount:sources.length,preflightGuardSha256:guard.sqlSha256,
  executableBundleSha256:sha(bundle),sources,
  expectedPreflight:'0046 catalogue empty of user data with provider ACL/events preserved',
  expectedPostflight:'0058 Office privacy, Pro-only internal scopes and Alap customer support',
  scope:'EXECUTABLE_SOURCE_BOUND_RELEASE_CANDIDATE_NO_HOSTED_RUN',
  ledgerHistoryReconciled:false,hostedExecutionAuthorized:false,hostedMutationPerformed:false,
  ownerKeyCustodyConfirmed:false,providerManagedRecoveryProven:false,
  actualAuthJwtPostgrestProven:false,releaseAuthorized:false,
 });
 return Object.freeze({bundle,manifest});
}
export function assessCandidate({manifest,bundle}={}){
 if(!manifest||manifest.contract!==CONTRACT||manifest.projectRef!==PROJECT_REF||
  manifest.sourceSetSha256!==SOURCE_78_SHA256||manifest.sourceCount!==31||
  manifest.releaseAuthorized!==false||manifest.hostedExecutionAuthorized!==false||
  manifest.ledgerHistoryReconciled!==false||manifest.actualAuthJwtPostgrestProven!==false||
  manifest.executableBundleSha256!==sha(bundle||'')||
  !bundle?.startsWith(PREFIX)||!bundle.endsWith(AFTER))
  fail('EXECUTABLE_BUNDLE_MANIFEST_INVALID');
 if(manifest.sources.length!==31||new Set(manifest.sources.map(x=>x.path)).size!==31)
  fail('SOURCE_MAP_INCOMPLETE');
 return Object.freeze({decision:'RELEASE_BUNDLE_SOURCE_COMPLETE_MANAGED_DEPLOYMENT_BLOCKED',
  sourceCount:31,sourceSetSha256:SOURCE_78_SHA256,bundleSha256:sha(bundle),
  appSqlPrepared:true,managedSqlExecuted:false,migrationLedgerReconciled:false,
  fullProviderRecoveryProven:false,realJwtRlsProofCompleted:false,
  releaseAuthorized:false});
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--emit'||resolve(args[1])!==resolve(OUTPUT))
  fail('ONLY_OFFLINE_RELEASE_BUNDLE_EMIT_SUPPORTED');
 const release=sourceBoundOfficeBundle();
 const report=assessCandidate(release);
 mkdirSync(resolve(OUTPUT),{recursive:true});
 writeFileSync(join(resolve(OUTPUT),'office-forward-31-transaction.sql'),release.bundle,{mode:0o600});
 writeFileSync(join(resolve(OUTPUT),'original-source-manifest.json'),JSON.stringify(release.manifest,null,2)+'\n');
 writeFileSync(join(resolve(OUTPUT),'release-state.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({decision:report.decision,originalSources:31,
  hostedExecutionAuthorized:false,releaseAuthorized:false,sqlSha256:report.bundleSha256}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(/^F6U03W_/.test(e.message)?e.message:'F6U03W_FAILURE');process.exitCode=1;}
}
