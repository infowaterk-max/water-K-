import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceBoundOfficeBundle,assessCandidate} from './shoperation-f6-u03w-office-release-bundle.mjs';
import {SOURCE_78_SHA256,PROJECT_REF} from './shoperation-f6-u03s-forward-release-readiness.mjs';

export const CONTRACT='shoporation.f6-u03x.single-adopted-baseline-office-integration.v1';
export const OUTPUT='artifacts/f6-u03x/single-baseline-integration';
export const HOSTED_EXECUTION_AUTHORIZED=false;
const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=s=>{throw Error('F6U03X_'+s)};
const lit=v=>v===null?'NULL':"'"+v.replaceAll("'","''")+"'";
const expectedName='shoperation_managed_0046_current_state';
const patchOnce=(s,from,to,code)=>{
 if(s.split(from).length!==2)fail(code);
 return s.replace(from,to);
};
export function assessBaselineEnvelope(baseline){
 if(!baseline||typeof baseline!=='object'||Array.isArray(baseline)||
  Object.keys(baseline).sort().join(',')!==['contract','name','projectRef','snapshotSha256','version'].sort().join(',')||
  baseline.contract!=='shoporation.f6-u03x.reviewed-0046-baseline-identity.v1'||
  baseline.projectRef!==PROJECT_REF||
  typeof baseline.version!=='string'||!/^\d{14}$/.test(baseline.version)||
  typeof baseline.name!=='string'||baseline.name!==expectedName||
  typeof baseline.snapshotSha256!=='string'||!/^[a-f0-9]{64}$/.test(baseline.snapshotSha256))
  fail('EXPLICIT_0046_BASELINE_IDENTITY_REQUIRED');
 return Object.freeze({version:baseline.version,name:baseline.name,
  snapshotSha256:baseline.snapshotSha256,projectRef:PROJECT_REF,
  claimedRemoteTracking:false,ownerApproved:false,releaseAuthorized:false});
}
export function ledgerBeforeSql(baseline){
 const b=assessBaselineEnvelope(baseline);
 return [
 '-- This lock, count, exact version and JSON fingerprint check are transaction-local.',
 'DO $f6u03x_ledger_before$',
 'DECLARE v_hash text;',
 'BEGIN',
 ' LOCK TABLE supabase_migrations.schema_migrations IN SHARE MODE NOWAIT;',
 ' IF (SELECT count(*) FROM supabase_migrations.schema_migrations)<>1 THEN',
 "  RAISE EXCEPTION 'F6U03X_BASELINE_HISTORY_COUNT_INVALID'; END IF;",
 ' SELECT md5(to_jsonb(m)::text) INTO v_hash',
 ' FROM supabase_migrations.schema_migrations AS m',
 ' WHERE m.version='+lit(b.version)+' AND m.name='+lit(b.name)+';',
 ' IF v_hash IS NULL OR length(v_hash)<>32 THEN',
 "  RAISE EXCEPTION 'F6U03X_APPROVED_BASELINE_VERSION_OR_NAME_MISSING'; END IF;",
 " PERFORM set_config('shoperation.f6u03x_baseline_fingerprint',v_hash,true);",
 'END',
 '$f6u03x_ledger_before$;'
 ].join('\n')+'\n';
}
export function ledgerAfterSql(baseline){
 const b=assessBaselineEnvelope(baseline);
 return [
 'DO $f6u03x_ledger_after$',
 'DECLARE v_hash text;',
 'BEGIN',
 ' IF (SELECT count(*) FROM supabase_migrations.schema_migrations)<>1 THEN',
 "  RAISE EXCEPTION 'F6U03X_LEDGER_ROW_COUNT_CHANGED'; END IF;",
 ' SELECT md5(to_jsonb(m)::text) INTO v_hash',
 ' FROM supabase_migrations.schema_migrations AS m',
 ' WHERE m.version='+lit(b.version)+' AND m.name='+lit(b.name)+';',
 ' IF v_hash IS NULL OR v_hash IS DISTINCT FROM',
 "    nullif(current_setting('shoperation.f6u03x_baseline_fingerprint',true),'') THEN",
 "  RAISE EXCEPTION 'F6U03X_BASELINE_LEDGER_FINGERPRINT_CHANGED'; END IF;",
 'END',
 '$f6u03x_ledger_after$;'
 ].join('\n')+'\n';
}
export function integratedOfficeBundle({baseline,original=sourceBoundOfficeBundle()}={}){
 const b=assessBaselineEnvelope(baseline),source=assessCandidate(original);
 if(source.appSqlPrepared!==true||source.sourceCount!==31||
  source.sourceSetSha256!==SOURCE_78_SHA256||
  source.releaseAuthorized!==false||source.managedSqlExecuted!==false||
  original.manifest?.sourceCount!==31||original.manifest?.releaseAuthorized!==false)
  fail('ORIGINAL_31_OFFICE_SQL_PROOF_REQUIRED');
 let sql=original.bundle;
 const before=ledgerBeforeSql(baseline),after=ledgerAfterSql(baseline);
 const originalPrefix='-- F6-U03w locked 0046 and provider state recheck follows.\n';
 sql=patchOnce(sql,originalPrefix,originalPrefix+before,'PREFIX_INJECTION_POINT_DRIFT');
 sql=patchOnce(sql,"(state->>'migrationHistory')::int<>0",
  "(state->>'migrationHistory')::int<>1",'PROVIDER_GUARD_HISTORY_DRIFT');
 const originalPost=' IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations) THEN';
 sql=patchOnce(sql,originalPost,
 ' IF (SELECT count(*) FROM supabase_migrations.schema_migrations)<>1 THEN',
 'POSTFLIGHT_LEDGER_ZERO_ASSUMPTION_DRIFT');
 sql=patchOnce(sql,'END\n$f6u03w_after$;\n-- F6-U03w: signed-source ordered Office forward end',
  'END\n$f6u03w_after$;\n'+after+'-- F6-U03w: signed-source ordered Office forward end',
  'POSTFLIGHT_LEDGER_HASH_INJECTION_DRIFT');
 if(!sql.startsWith('BEGIN;\n')||!sql.endsWith('COMMIT;\n')||
  sql.indexOf('$f6u03x_ledger_before$')>sql.indexOf('0047_team_permissions_foundation_v1.sql')||
  sql.indexOf('$f6u03x_ledger_after$')<sql.indexOf('0058_digital_office_plan_scoped_sql_guard_v2.sql')||
  (sql.match(/^-- F6-U03w ORIGINAL #/gm)||[]).length!==31)
  fail('TRANSACTION_OR_31_FILE_BOUNDARY_INVALID');
 return Object.freeze({
  sql,ledgerBefore:before,ledgerAfter:after,
  manifest:Object.freeze({
   contract:CONTRACT,projectRef:PROJECT_REF,
   siblingHeads:Object.freeze({
    receipt:'7a6aa4307985d21581fd9969c28a425d17b08ee5',
    adoption:'37ca430134803f815b5348ebce605c2117a0b7b8',
    office:'f8938a108204a1cb20f1a5b434b782c1e9d5b120'}),
   baselineVersion:b.version,baselineName:b.name,reviewedSnapshotSha256:b.snapshotSha256,
   baselineIsCallerSuppliedIdentityOnly:true,
   baselineRealRemoteRowVerified:false,originalOfficeSourceSetSha256:SOURCE_78_SHA256,
   originalOfficeBundleSha256:source.bundleSha256,
   integratedBundleSha256:sha(sql),exactForwardSources:31,
   originalSourceSha256:original.manifest.sources.map(s=>s.sha256),
   guardedLedgerRows:1,immutableLedgerWithinTransaction:true,
   hostedTouched:false,hostedMigrationLedgerWritten:false,
   ownerPrivateKeyCustodyVerified:false,providerAuthJwtRlsProven:false,
   releaseAuthorized:false
  })
 });
}
export function assessIntegratedRelease(candidate){
 if(!candidate||candidate.manifest?.contract!==CONTRACT||
  candidate.manifest.projectRef!==PROJECT_REF||
  candidate.manifest.exactForwardSources!==31||
  candidate.manifest.originalOfficeSourceSetSha256!==SOURCE_78_SHA256||
  candidate.manifest.originalSourceSha256?.length!==31||
  candidate.manifest.integratedBundleSha256!==sha(candidate.sql||'')||
  !candidate.sql.startsWith('BEGIN;\n')||!candidate.sql.endsWith('COMMIT;\n')||
  candidate.manifest.baselineRealRemoteRowVerified!==false||
  candidate.manifest.releaseAuthorized!==false||
  candidate.manifest.hostedMigrationLedgerWritten!==false||
  candidate.manifest.hostedTouched!==false)
  fail('INTEGRATED_CANDIDATE_OR_RELEASE_OVERCLAIM');
 return Object.freeze({
  contract:CONTRACT,decision:'INTEGRATED_SOURCE_PREPARED_LIVE_BASELINE_ADOPTION_UNVERIFIED',
  exactForwardSources:31,guardedLedgerRows:1,
  originalSourceUnchanged:true,nativePg17LedgerSimulationNotProviderProof:true,
  baselineRemoteHistoryProven:false,ownerRecoveryKeyProven:false,
  managedProviderAuthRlsProven:false,hostedTouched:false,releaseAuthorized:false
 });
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length!==3||args[0]!=='--emit'||resolve(args[2])!==resolve(OUTPUT))
  fail('NO_HOSTED_APPLY_OR_UNBOUNDED_CLI');
 const baseline=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
 const release=integratedOfficeBundle({baseline});
 mkdirSync(resolve(OUTPUT),{recursive:true});
 writeFileSync(join(resolve(OUTPUT),'office-31-single-baseline-transaction.sql'),release.sql,{mode:0o600});
 writeFileSync(join(resolve(OUTPUT),'ledger-before.sql'),release.ledgerBefore);
 writeFileSync(join(resolve(OUTPUT),'ledger-after.sql'),release.ledgerAfter);
 writeFileSync(join(resolve(OUTPUT),'manifest.json'),JSON.stringify(release.manifest,null,2)+'\n');
 writeFileSync(join(resolve(OUTPUT),'status.json'),JSON.stringify(assessIntegratedRelease(release),null,2)+'\n');
 console.log(JSON.stringify({contract:CONTRACT,decision:'SOURCE_ONLY_ONE_BASELINE_SQL_READY',
  sqlSha256:release.manifest.integratedBundleSha256,sourceCount:31,
  hostedTouched:false,releaseAuthorized:false}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(/^F6U03X_/.test(e.message)?e.message:'F6U03X_FAILURE');process.exitCode=1}
}
