import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCandidateManifest,checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';
import {buildBoundOriginalForwardSource} from './shoperation-f6-u03s-forward-release-readiness.mjs';
import {buildReadOnlyProvenanceSQL} from './shoperation-f6-u03t-provenance-gate.mjs';

export const CONTRACT='shoporation.f6-u03w.0046-baseline-adoption-handoff.v1';
export const PROJECT_REF='istjjkdcvsvilrycqecd';
export const HISTORIC_RUN_ID='37919705159';
export const HISTORIC_RUN_ATTEMPT=2;
export const HISTORIC_JOB_ID='113806799257';
export const HISTORIC_ARTIFACT_ID='11613699688';
export const HISTORIC_ARTIFACT_ZIP_SHA='b7d97cafb6af3a315ca7dc21cd48bf1f07ca9e131f192e12d73383bc4864d170';
export const HISTORIC_PROOF_RAW_SHA='a5411b2dd5e61db3c79e2f604386b4fca60e6075edbe936ae107278fc5f7df45';
export const HISTORIC_SOURCE_COMMIT='03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4';
export const HISTORIC_SOURCE_CONTRACT_SHA='a04b0990e7cf7a0a21591b9fd81fa44d5010ca8818b7edb7f00397c6b84807bb';
export const EXPECTED_LEGACY_DEFINITION_COUNT=4621;
export const EXPECTED_LEGACY_CATALOG_MD5='e312b40ad91150ce937f4aa00db587f3';
export const OUTPUT='artifacts/f6-u03w/managed-0046-handoff';
export const HOSTED_EXECUTION_AUTHORIZED=false;
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('F6U03W_'+s)};
const exactKeys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===k.slice().sort().join(',');
const requiredChecks=['targetPreflight','orderedMigrations','authBootstrap','neutralSeed','targetPostflight'];

let cachedCanonicalManifest=null;
function canonicalManifest(){
 if(!cachedCanonicalManifest){
  const src=buildCandidateManifest();
  if(checkCandidateManifest(src)!==true||src.sources.length!==78)fail('CANONICAL_SOURCE_NOT_VERIFIED');
  cachedCanonicalManifest=src;
 }
 return cachedCanonicalManifest;
}
export function validateHistoricProofShape(proof,{sourcePaths}={}){
 const src=canonicalManifest();
 sourcePaths??=src.sources.slice(0,47).map(x=>x.path);
 if(src.sources.length!==78||sourcePaths.length!==47)
  fail('CANONICAL_SOURCE_NOT_VERIFIED');
 if(!proof||typeof proof!=='object'||Array.isArray(proof)||
  proof.contract!=='shoporation.fresh-install-proof.v2'||
  proof.repository!==['infowaterk-max','water'+'-'+'K-'].join('/')||
  proof.sourceCommit!==HISTORIC_SOURCE_COMMIT||
  proof.ciRunId!==HISTORIC_RUN_ID||
  proof.ciWorkflow!=='CI'||proof.environment!=='fresh-install-disposable'||
  proof.proofContractSha256!==HISTORIC_SOURCE_CONTRACT_SHA||
  proof.baselineStatus!=='snapshot-reviewed'||proof.freshInstallProofRequired!==true||
  proof.authBootstrapFile!=='supabase/customer-baseline/auth-bootstrap.sql'||
  proof.seedFile!=='supabase/customer-baseline/seed.sql'||
  !Number.isFinite(Date.parse(proof.generatedAt))||
  !exactKeys(proof.checks,requiredChecks)||requiredChecks.some(k=>proof.checks[k]!=='PASS'))
  fail('HISTORIC_PROOF_CONTRACT_MISMATCH');
 const paths=proof.migrationFiles;
 if(!Array.isArray(paths)||paths.length!==47||
  JSON.stringify(paths)!==JSON.stringify(sourcePaths)||
  new Set(paths).size!==47||
  paths[0]!=='supabase/customer-baseline/migrations/0001_shoperation_v1_schema.sql'||
  paths.at(-1)!=='supabase/customer-baseline/migrations/0046_alap_team_chat_plan_grant_reconcile.sql'||
  paths.filter(p=>/\/0026_/.test(p)).length!==2)
  fail('HISTORIC_ORIGINAL_0046_ORDER_MISMATCH');
 return Object.freeze({originalFiles:47,allFiveChecksPassed:true,
  sourceCommit:proof.sourceCommit,runId:proof.ciRunId,environment:proof.environment});
}
export function verifyOriginalArtifactProof(raw,{artifactZipDigest=HISTORIC_ARTIFACT_ZIP_SHA}={}){
 if(typeof raw!=='string'||raw.length<3000||raw.length>25000||
   sha(raw)!==HISTORIC_PROOF_RAW_SHA||
   artifactZipDigest!==HISTORIC_ARTIFACT_ZIP_SHA)fail('ORIGINAL_GITHUB_ARTIFACT_HASH_MISMATCH');
 let proof;
 try{proof=JSON.parse(raw)}catch{fail('ORIGINAL_GITHUB_ARTIFACT_INVALID_JSON')}
 const checked=validateHistoricProofShape(proof);
 return Object.freeze({
  contract:CONTRACT,historicalEvidence:'EXACT_GITHUB_ORIGINAL_0046_SQL_APPLY_RECEIPT',
  githubRunId:HISTORIC_RUN_ID,attempt:HISTORIC_RUN_ATTEMPT,
  jobId:HISTORIC_JOB_ID,artifactId:HISTORIC_ARTIFACT_ID,
  artifactZipSha256:artifactZipDigest,proofJsonSha256:sha(raw),
  ...checked,historicalSourceApplyAttested:true,
  historicalSecretTargetProjectBindingProven:false,
  modern0048Installed:false,
  migrationHistoryReconciled:false,releaseAuthorized:false
 });
}
export function buildCurrentTargetCatalogSql(){
 const sql=buildReadOnlyProvenanceSQL();
 if(!sql.startsWith('WITH object_defs AS (\n')||!sql.includes('AS f6_u03t_readonly FROM object_defs;'))
  fail('CANONICAL_LIVE_QUERY_DRIFT');
 return sql;
}
export function assessTarget0046({projectRef,source,observed,now=Date.now()}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')fail('WRONG_PROJECT_OR_UNTRUSTED_SOURCE');
 if(!exactKeys(observed,['capturedAt','database','role','pgVersion','catalogCount','catalogMd5','migrationLedger','modernOfficeParticipants']))
  fail('LIVE_CATALOG_SHAPE_INVALID');
 const at=Date.parse(observed.capturedAt);
 if(!Number.isFinite(at)||at>now+30000||now-at>900000)fail('LIVE_CATALOG_STALE');
 if(observed.database!=='postgres'||observed.role!=='postgres'||
  !Number.isInteger(observed.pgVersion)||Math.floor(observed.pgVersion/10000)!==17||
  !Number.isSafeInteger(observed.catalogCount)||!Number.isSafeInteger(observed.migrationLedger))
  fail('LIVE_CATALOG_IDENTITY_INVALID');
 const original0046Consistent=observed.catalogCount===EXPECTED_LEGACY_DEFINITION_COUNT&&
  observed.catalogMd5===EXPECTED_LEGACY_CATALOG_MD5&&
  observed.migrationLedger===0&&observed.modernOfficeParticipants===null;
 return Object.freeze({
  contract:CONTRACT,projectRef,observedAt:observed.capturedAt,
  knownLegacy0046CatalogMatches:original0046Consistent,
  activeSchemaIsUntracked:observed.migrationLedger===0,
  projectBindingAuthority:'CURRENT_SUPABASE_CONNECTOR_ONLY_NOT_HISTORICAL_GITHUB_SECRET',
  historicRunAppliedToThisTargetUnproven:true,
  decision:original0046Consistent?'CANDIDATE_NEW_BASELINE_CAPTURE_ONLY':'BLOCKED_CATALOG_OR_LEDGER_DRIFT',
  hostedTouched:false,releaseAuthorized:false
 });
}
export function buildHandoff({originalProof,currentTarget=null}={}){
 if(!originalProof||originalProof.contract!==CONTRACT||
  originalProof.historicalSourceApplyAttested!==true||
  originalProof.historicalSecretTargetProjectBindingProven!==false)
  fail('EXACT_HISTORICAL_RECEIPT_REQUIRED');
 const bound=buildBoundOriginalForwardSource();
 if(bound.originalCount!==78||bound.forwardCount!==31||bound.originalGitSourceVerified!==true||
  bound.hostedExecutionAuthorized!==false)fail('CANONICAL_FORWARD_31_DRIFT');
 if(currentTarget!==null&&(currentTarget.contract!==CONTRACT||currentTarget.projectRef!==PROJECT_REF||
   currentTarget.hostedTouched!==false||currentTarget.releaseAuthorized!==false||
   currentTarget.knownLegacy0046CatalogMatches!==true))
  fail('CURRENT_MANAGED_STATE_NOT_ATTESTED');
 return Object.freeze({
  contract:CONTRACT,scope:'HISTORIC_RECEIPT_PLUS_ISOLATED_BASELINE_ADOPTION_PREPARATION_ONLY',
  projectRef:PROJECT_REF,
  historicalApplyProof:originalProof,
  currentTargetCatalogReadOnlyProof:currentTarget,
  forwardCanonicalSourceSha256:bound.sourceSetSha256,
  forwardOriginalCount:bound.forwardCount,
  forwardSourceSqlSha256:bound.originalForwardSqlSha256,
  forwardPaths:bound.paths.map(x=>({path:x.path,sha256:x.sha256,sourceCommit:x.sourceCommit})),
  isolatedBaselineRequired:true,
  historicalProjectBindingProven:false,
  currentManagedSnapshotCaptured:false,
  currentManagedSnapshotReviewed:false,
  ownerOffPlatformKeyCustodyVerified:false,
  authenticatedProviderRoleAcceptanceVerified:false,
  ownerAdoptionApprovalVerified:false,
  migrationHistoryWritten:false,
  hostedOfficeMigrationExecuted:false,
  hostedTouched:false,
  decision:'BLOCKED_APPROVED_CURRENT_STATE_BASELINE_ADOPTION_REQUIRED',
  releaseAuthorized:false
 });
}
export function operatorRunbook(packet){
 if(!packet||packet.contract!==CONTRACT||packet.releaseAuthorized!==false||
  packet.forwardOriginalCount!==31||packet.projectRef!==PROJECT_REF)
  fail('HANDOFF_NOT_BOUND_TO_SOURCE');
 return [
 '# Managed Fresh Install: new 0046 state baseline adoption — HUMAN APPROVAL REQUIRED',
 '',
 'Status: BLOCKED. This is a review handoff, not a deployment script.',
 'Source receipt: GitHub Actions run '+HISTORIC_RUN_ID+' attempt 2, job '+HISTORIC_JOB_ID+
   ', original artifact '+HISTORIC_ARTIFACT_ID+'. The zip and JSON hashes are in handoff.json.',
 'Target Supabase project: '+PROJECT_REF+'. Do not use staging, waterk-platform or another customer database.',
 '',
 '## 1. Before touching migration history',
 '- Confirm the owner has an independently retained matching backup decryption key and a tested recovery process (Auth/Storage/PITR separate).',
 '- Obtain fresh explicit owner approval specifying project ref, DB catalog hash, Git source digest, recovery operator and exact baseline version.',
 '- Verify the original 2026-10-09 Actions secret target database linkage independently. Historical artifact receipt does not identify its DB host.',
 '- Freeze current original 0046 catalog (4621 definitions, known MD5 '+EXPECTED_LEGACY_CATALOG_MD5+'), empty remote migration ledger, and absence of Office 0048.',
 '- Stop on any changed catalog, nonzero ledger, new users, partially applied 0047+, missing key or unexpected target.',
 '',
 '## 2. Create CURRENT-STATE schema-only snapshot (separate managed workspace)',
 '- Use an isolated temporary, unlinked Supabase CLI workspace. NEVER use the root supabase/migrations (hundreds of legacy developer migrations).',
 '- Generate a SCHEMA-ONLY dump of reviewed public/private application schemas from the current Fresh Install DB using supabase db dump (not db pull with interactive remote history update).',
 '- Keep database URLs, connection passwords, any private function definitions and the raw dump in restricted owner-controlled storage, not default CI artifacts or PR diffs.',
 '- Independently review RLS, policies, views, extensions, grants, owner-bound service-only tables, Auth/Storage dependencies and 113 neutral rows. No customer data or provider secrets.',
 '- Assign ONE new, separately versioned current-state baseline file; do NOT re-run original SQL 0001-0046 against this occupied target.',
 '',
 '## 3. Adopt a new baseline — separately authorized remote tracking write ONLY',
 '- Preserve the original 47-source October 9 history as historical deployment evidence; do not insert 47 fictional Supabase applied rows.',
 '- Review a single new current-state baseline migration against the live catalog and in a disposable PostgreSQL17 restore before any remote tracking change.',
 '- Use the Supabase migration history repair command ONLY after the owner signs off and the target is revalidated; the effect is a remote migration ledger write, not read-only.',
 '- After separately authorized baseline adoption, execute a Supabase migration list comparison and db push --dry-run in an isolated workspace; if historical developer SQL appears, ABORT.',
 '',
 '## 4. Stage exact 31 future Office forwards separately',
 '- Preserve original 0047-0058 file bytes and manifest SHA; stage only their approved ordered mapping after the reviewed baseline (no rewritten obsolete Pro-only RLS).',
 '- Verify forward native PG17 atomic occupied upgrade and rollback proof, then obtain separate migration/recovery authorization. No auto-apply.',
 '- Independently establish 3 real Auth identities, tenant fixtures, role revocation, signed JWT and PostgREST Alap/Pro allow/deny before Digital Office acceptance.',
 '',
 'ReleaseAuthorized: false. No live Supabase DDL/DML or history stamp was performed in this unit.'
 ].join('\n')+'\n';
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length!==3||args[0]!=='--emit'||resolve(args[2])!==resolve(OUTPUT))
  fail('RECEIPT_AND_FIXED_OUTPUT_REQUIRED');
 const raw=readFileSync(resolve(args[1]),'utf8');
 const artifact=verifyOriginalArtifactProof(raw);
 const packet=buildHandoff({originalProof:artifact});
 mkdirSync(resolve(OUTPUT),{recursive:true});
 writeFileSync(join(resolve(OUTPUT),'handoff.json'),JSON.stringify(packet,null,2)+'\n');
 writeFileSync(join(resolve(OUTPUT),'operator-review.md'),operatorRunbook(packet));
 writeFileSync(join(resolve(OUTPUT),'managed-catalog-readonly.sql'),buildCurrentTargetCatalogSql());
 console.log(JSON.stringify({contract:CONTRACT,artifactId:HISTORIC_ARTIFACT_ID,
  originalFiles:47,forwardFiles:31,decision:packet.decision,
  historicalTargetBinding:false,hostedTouched:false,releaseAuthorized:false}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(/^F6U03W_/.test(e.message)?e.message:'F6U03W_UNCLASSIFIED_FAILURE');process.exitCode=1;}
}
