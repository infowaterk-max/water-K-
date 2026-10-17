import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_78_SHA256,PROJECT_REF,EXPECTED_CATALOG_MD5,buildBoundOriginalForwardSource} from './shoperation-f6-u03s-forward-release-readiness.mjs';
import {EXPECTED_OBJECT_COUNT} from './shoperation-f6-u03g-catalog-drift.mjs';
export const CONTRACT='shoporation.f6-u03w.existing-baseline-adoption.v1';
export const SCOPE='HISTORIC_0046_JOB_AND_NEW_STATE_BASELINE_REVIEW_ONLY';
export const OUTPUT='artifacts/f6-u03w/baseline-adoption';
export const HOSTED_WRITE_ENABLED=false;
export const HISTORIC=Object.freeze({
 runId:37919705159,attempt:2,jobId:113806799257,
 sourceHead:'03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4',
 workflowPath:'.github/workflows/ci.yml',
 proofContractSha256:'a04b0990e7cf7a0a21591b9fd81fa44d5010ca8818b7edb7f00397c6b84807bb',
 proofArtifactId:11613699688
});
const fail=s=>{throw Error('F6U03W_'+s)};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===keys.slice().sort().join(',');
export function inspectLocalMigrationAuthority({root=process.cwd()}={}){
 const count=p=>readdirSync(resolve(root,p)).filter(s=>s.endsWith('.sql')).length;
 const historicCount=count('supabase/migrations');
 const customerCount=count('supabase/customer-baseline/migrations');
 const manifest=JSON.parse(readFileSync(resolve(root,'supabase/customer-baseline/manifest.json'),'utf8'));
 if(historicCount<400||customerCount!==59||manifest.status!=='snapshot-reviewed'||
  manifest.legacyMigrationReplay!==false||manifest.freshInstallProofRequired!==true||
  manifest.baselineMigrationDirectory!=='supabase/customer-baseline/migrations')
  fail('UNEXPECTED_MIGRATION_ROOT_OR_BASELINE');
 return Object.freeze({rootLegacyMigrationCount:historicCount,
  canonicalCustomerSourceCount:customerCount,
  historicRootMayBePushedToFreshInstall:false,
  isolatedNewBaselineWorkspaceRequired:true,sourceSetSha256:SOURCE_78_SHA256,
  noAutomaticRepairOrPush:true});
}
export function assessAdoption({projectRef,source,current,github,original,local,now=Date.now()}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')fail('UNBOUND_MANAGED_PROJECT');
 if(!local||local.rootLegacyMigrationCount<400||local.canonicalCustomerSourceCount!==59||
  local.historicRootMayBePushedToFreshInstall!==false||
  local.isolatedNewBaselineWorkspaceRequired!==true||
  local.sourceSetSha256!==SOURCE_78_SHA256||local.noAutomaticRepairOrPush!==true)
  fail('ROOT_MIGRATION_AUTHORITY_DRIFT');
 if(!original||original.sourceSetSha256!==SOURCE_78_SHA256||
  original.forwardCount!==31||original.originalCount!==78||
  original.originalGitSourceVerified!==true||original.hostedExecutionAuthorized!==false)
  fail('ORIGINAL_78_SOURCE_DRIFT');
 const needed=['runId','attempt','jobId','sourceHead','workflowPath','proofContractSha256','proofArtifactId','runConclusion','jobConclusion'];
 if(!exact(github,needed)||github.runId!==HISTORIC.runId||
  github.attempt!==HISTORIC.attempt||github.jobId!==HISTORIC.jobId||
  github.sourceHead!==HISTORIC.sourceHead||github.workflowPath!==HISTORIC.workflowPath||
  github.proofContractSha256!==HISTORIC.proofContractSha256||
  github.proofArtifactId!==HISTORIC.proofArtifactId||
  github.runConclusion!=='failure'||github.jobConclusion!=='success')
  fail('HISTORIC_JOB_EVIDENCE_NOT_EXACT');
 if(!exact(current,['capturedAt','database','role','pgVersion','catalogCount','catalogMd5','migrationRows','authUsers','modernOfficeParticipants'])||
  current.database!=='postgres'||current.role!=='postgres'||
  !Number.isInteger(current.pgVersion)||Math.floor(current.pgVersion/10000)!==17)
  fail('INVALID_MANAGED_OBSERVATION');
 const time=Date.parse(current.capturedAt);
 if(!Number.isFinite(now)||!Number.isFinite(time)||time>now+30000||now-time>900000)
  fail('STALE_OR_FUTURE_MANAGED_OBSERVATION');
 if(!Number.isSafeInteger(current.catalogCount)||!Number.isSafeInteger(current.migrationRows)||
  !Number.isSafeInteger(current.authUsers)||current.migrationRows<0||current.authUsers<0||
  !/^[a-f0-9]{32}$/.test(current.catalogMd5||'')||
  current.modernOfficeParticipants!==null&&typeof current.modernOfficeParticipants!=='string')
  fail('MALFORMED_MANAGED_STATE');
 const blockers=[];
 if(current.catalogCount!==EXPECTED_OBJECT_COUNT||current.catalogMd5!==EXPECTED_CATALOG_MD5)
  blockers.push('HOSTED_0046_CATALOG_NOT_EQUAL');
 if(current.migrationRows!==0)blockers.push('UNEXPECTED_HOSTED_MIGRATION_LEDGER_ROWS');
 if(current.authUsers!==0)blockers.push('NEW_AUTH_IDENTITIES_UNREVIEWED');
 if(current.modernOfficeParticipants!==null)blockers.push('MODERN_0048_ALREADY_PRESENT');
 blockers.push('HISTORIC_GITHUB_DB_URL_MASKED_ENDPOINT_IDENTITY_NOT_ATTESTED');
 blockers.push('ISOLATED_CURRENT_STATE_BASELINE_NOT_CAPTURED_AND_REVIEWED');
 blockers.push('OWNER_BACKUP_KEY_AND_PROVIDER_RECOVERY_UNCONFIRMED');
 blockers.push('SIGNED_AUTH_JWT_POSTGREST_TENANT_DENIAL_UNPROVEN');
 blockers.push('EXPLICIT_OWNER_MANAGED_WRITE_APPROVAL_NOT_GIVEN');
 const catalogParity= !blockers.some(x=>/^(HOSTED_|UNEXPECTED_|NEW_AUTH_|MODERN_0048)/.test(x));
 return Object.freeze({
  contract:CONTRACT,scope:SCOPE,projectRef,observedAt:current.capturedAt,
  historicJob:{runId:HISTORIC.runId,jobId:HISTORIC.jobId,attempt:HISTORIC.attempt,
   sourceHead:HISTORIC.sourceHead,proofContractSha256:HISTORIC.proofContractSha256,
   proofArtifactId:HISTORIC.proofArtifactId,originalJobSucceeded:true,
   overallWorkflowSucceeded:false,targetEndpointCryptographicallyLinked:false},
  knownHosted0046Snapshot:{objectCount:current.catalogCount,md5:current.catalogMd5,
   matchesKnownHostedSnapshot:catalogParity,doesNotProveHistoricalSupabaseLedgerRows:true},
  original78SourceSetSha256:SOURCE_78_SHA256,originalForwardSources:31,
  historicRootMigrations:local.rootLegacyMigrationCount,
  customerBaselineSources:local.canonicalCustomerSourceCount,
  recommendedStrategy:'ISOLATED_NEW_CURRENT_STATE_BASELINE_NOT_47_FAKE_STAMPS',
  decision:catalogParity?'HISTORIC_0046_CORROBORATED_ADOPTION_REVIEW_ONLY':'BLOCKED_CATALOG_DRIFT',
  blockers,hostedSchemaTouched:false,hostedLedgerTouched:false,
  historicalMigrationsMarkedApplied:false,remoteBaselineCaptured:false,
  dbPushFromRootPermitted:false,dbPullNoninteractivePermitted:false,
  signedProviderJwtProven:false,releaseAuthorized:false
 });
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length===2&&args[0]==='--emit-review'&&resolve(args[1])===resolve(OUTPUT)){
  const original=buildBoundOriginalForwardSource(),local=inspectLocalMigrationAuthority();
  if(!/^[a-f0-9]{64}$/.test(original.originalForwardSqlSha256))
   fail('SOURCE_SHA_MISSING');
  mkdirSync(resolve(OUTPUT),{recursive:true});
  writeFileSync(join(resolve(OUTPUT),'source-authority.json'),JSON.stringify({
   contract:CONTRACT,projectRef:PROJECT_REF,sourceSetSha256:original.sourceSetSha256,
   originalForwardSha256:original.originalForwardSqlSha256,
   originalCount:original.originalCount,forwardCount:original.forwardCount,
   local,historicJob:HISTORIC,maskedEndpointBindingConfirmed:false,
   remoteBaselineCaptured:false,hostedTouched:false,releaseAuthorized:false
  },null,2)+'\n');
  console.log(JSON.stringify({decision:'SOURCE_ONLY_REVIEW_EMITTED',
   legacyRootMigrations:local.rootLegacyMigrationCount,
   originalOfficeForward:31,hostedTouched:false,releaseAuthorized:false}));return;
 }
 fail('REMOTE_MIGRATION_REPAIR_OR_UNAPPROVED_CLI_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
