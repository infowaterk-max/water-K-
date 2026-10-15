import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {composeLocalFresh59,boundLocalFixtureBootstrap,LOCAL_DATABASES} from './shoperation-f6-u03i-local-59-proof.mjs';
import {inspectOfficeGap,MAIN_OFFICE_SOURCES} from './shoperation-f6-u03j-office-dependency-dag.mjs';
export const SCOPE='ISOLATED_DOCKER_PG17_59_PLUS_18_DIAGNOSTIC_NOT_RELEASE';
export const HOSTED_EXECUTION_ENABLED=false;
export const TARGET='artifacts/f6-u03k/local-77';
const fail=x=>{throw Error(x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const delimiter="-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0055_communication_hub_2_0_foundation_v1.sql";
const after57="-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0058_digital_office_plan_scoped_sql_guard_v2.sql";
const followUp='20260910070300_communication_hub_2_0_fk_indexes_v1.sql';
export function composeOriginalSourceDiagnostic({mode='commit',root=process.cwd()}={}){
 if(!['commit','rollback'].includes(mode))fail('F6U03K_NOT_A_LOCAL_MODE');
 const old=composeLocalFresh59({root,mode});
 const d=inspectOfficeGap({root});
 if(d.decision!=='BLOCKED_59_SOURCE_DAG'||d.candidateSources.length!==18||
    d.reviewedFileCount!==59||d.missingRequiredTables.length!==4)
  fail('F6U03K_UNREVIEWED_OR_MISSING_SOURCE');
 if(old.sql.split(delimiter).length!==2||old.sql.split(after57).length!==2)fail('F6U03K_IMMUTABLE_MIGRATION_ANCHOR_MISSING');
 const timestamped=d.candidateSources.map(f=>{
  const sql=readFileSync(resolve(root,f.path),'utf8');
  if(sha(Buffer.from(sql))!==f.sha256)fail('F6U03K_PINNED_SOURCE_DRIFT:'+f.name);
  if(/^\s*(?:begin|commit|rollback)\s*;/gim.test(sql))
   fail('F6U03K_NESTED_TRANSACTION_DIRECTIVE:'+f.name);
  return {path:f.path,sql};
 });
 const preceding=timestamped.filter(f=>!f.path.endsWith('/'+followUp));
 const later=timestamped.filter(f=>f.path.endsWith('/'+followUp));
 if(preceding.length!==17||later.length!==1||timestamped.at(-1)!==later[0])
  fail('F6U03K_17_BEFORE_0055_ONE_AFTER_0057_REQUIRED');
 const emit=list=>list.map(f=>'-- F6U03K_PINNED_ORIGINAL_MAIN_SOURCE '+f.path+'\n'+f.sql).join('\n\n')+'\n\n';
 const sql=old.sql.replace(delimiter,emit(preceding)+delimiter).replace(after57,emit(later)+after57);
 if((sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    sql.indexOf('ORIGINAL TARGET PREFLIGHT')>sql.indexOf('F6U03K_PINNED_ORIGINAL_MAIN_SOURCE')||
    sql.indexOf('F6U03K_PINNED_ORIGINAL_MAIN_SOURCE')>sql.indexOf(delimiter)||
    sql.indexOf('20260910070300_communication_hub_2_0_fk_indexes_v1.sql')<sql.indexOf('0057_communication_hub_2_0_advanced_guards_and_object_links_v1.sql')||
    sql.indexOf('20260910070300_communication_hub_2_0_fk_indexes_v1.sql')>sql.indexOf(after57)||
    sql.indexOf('ORIGINAL TARGET POSTFLIGHT')<sql.indexOf(delimiter)||
    sql.indexOf('F6U03I_INJECTED_ABORT_BEFORE_COMMIT')!==-1&&mode==='commit')
   fail('F6U03K_ATOMIC_SQL_ORDER_DRIFT');
 const manifest={
  contract:'shoporation.f6-u03k.immutable-local-original-sources.v1',scope:SCOPE,mode,
  reviewed59Count:59,extraOriginalCount:18,uniqueOriginalFiles:77,
  approved59SourceSha256:old.manifest.sourceSetSha256,
  authorityMain:d.authorityMainSha,extraSourcePaths:d.candidateSources.map(x=>x.path),
  extraGitBlobs:d.candidateSources.map(x=>x.blob),sourceSqlSha256:sha(sql),
  predecessorBefore0055Count:17,followupAfter0057Count:1,
  localDatabase:old.manifest.localDatabase,
  originalCompanions:true,pre0055:true,
  hostedTouched:false,releaseAuthorized:false,hostedMigrationExecutionAuthorized:false,
  managedProviderProven:false,signedInAlapProRlsProven:false,activeSupabaseProjectUsed:false,
  guaranteedCommit:false,guaranteedRollback:false
 };
 return {sql,manifest};
}
export function locateActualFailure(sql,errorLog){
 const x=/commit\.sql:(\d+):\s+ERROR:\s*([^\r\n]+)/.exec(errorLog||'');
 if(!x)fail('F6U03K_MISSING_REAL_SQL_ERROR');
 const ln=Number(x[1]),lines=sql.split('\n');
 if(!Number.isSafeInteger(ln)||ln<=0||ln>lines.length)fail('F6U03K_SQL_LINE_INVALID');
 let marker=null;
 for(let i=0;i<ln;i++){
  const a=/^-- (F6U03K_PINNED_ORIGINAL_MAIN_SOURCE|F6U03I_ORIGINAL_SOURCE)\s+(.+\.sql)$/.exec(lines[i]);
  if(a)marker={category:a[1],source:a[2]};
 }
 return {line:ln,error:x[2],marker,decision:'LOCAL_SOURCE_SQL_FAILED',releaseAuthorized:false,
   full77SourcesCommitted:false,hostedTouched:false,rollbackNotProven:true};
}
export function classifyLocalOutcome({mode,exitCode,actualNoAppObjects,postflight,committed,forcedAbort}={}){
 if(mode==='commit'&&Number.isInteger(exitCode)&&exitCode!==0&&actualNoAppObjects===true)
  return {decision:'BLOCKED_REAL_ORIGINAL_SQL',releaseAuthorized:false,atomicSourceCommitProven:false};
 if(mode==='commit'&&exitCode===0&&postflight===true&&committed===true)
  return {decision:'LOCAL_SOURCE_COMMITTED_NOT_RELEASE',releaseAuthorized:false,atomicSourceCommitProven:true};
 if(mode==='rollback'&&exitCode!==0&&forcedAbort===true&&actualNoAppObjects===true)
  return {decision:'LOCAL_FAULT_ROLLBACK_PROVEN_NOT_RELEASE',releaseAuthorized:false};
 fail('F6U03K_UNSUPPORTED_OR_FALSE_GREEN_OUTCOME');
}
function cli(){
 const [op,target]=process.argv.slice(2);
 if(op!=='--emit-bundle'||process.argv.length!==4||resolve(target||'')!==resolve(TARGET))
  fail('F6U03K_NO_DATABASE_OR_HOSTED_CLI');
 const good=composeOriginalSourceDiagnostic({mode:'commit'});
 const bad=composeOriginalSourceDiagnostic({mode:'rollback'});
 mkdirSync(resolve(TARGET),{recursive:true});
 writeFileSync(join(resolve(TARGET),'bootstrap-fresh.sql'),boundLocalFixtureBootstrap(LOCAL_DATABASES.commit));
 writeFileSync(join(resolve(TARGET),'bootstrap-abort.sql'),boundLocalFixtureBootstrap(LOCAL_DATABASES.rollback));
 writeFileSync(join(resolve(TARGET),'commit.sql'),good.sql);
 writeFileSync(join(resolve(TARGET),'rollback.sql'),bad.sql);
 writeFileSync(join(resolve(TARGET),'manifest.json'),JSON.stringify({commit:good.manifest,rollback:bad.manifest},null,2)+'\n');
 console.log(JSON.stringify({scope:SCOPE,original59:59,extraSources:18,localOnly:true,hostedTouched:false,releaseAuthorized:false}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
