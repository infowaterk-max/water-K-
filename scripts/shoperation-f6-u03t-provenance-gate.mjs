import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileCatalogQueries,HOSTED_RAW_MD5,EXPECTED_OBJECT_COUNT} from './shoperation-f6-u03g-catalog-drift.mjs';
import {buildBoundOriginalForwardSource,PROJECT_REF,SOURCE_78_SHA256} from './shoperation-f6-u03s-forward-release-readiness.mjs';

export const CONTRACT='shoporation.f6-u03t.legacy-catalog-provenance.v1';
export const SCOPE='KNOWN_HOSTED_0046_CATALOG_READONLY_NOT_MIGRATION_PROVENANCE';
export const OUTPUT='artifacts/f6-u03t/provenance';
export const HOSTED_EXECUTION_AUTHORIZED=false;
const fail=x=>{throw new Error('F6U03T_'+x)};
const EXPECTED_TAIL="SELECT count(*),md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)) FROM object_defs;\n";

export function buildReadOnlyProvenanceSQL(){
 const catalog=compileCatalogQueries();
 if(!catalog.original.startsWith('WITH object_defs AS (\n')||!catalog.original.endsWith(EXPECTED_TAIL)||
    catalog.original.slice(0,-EXPECTED_TAIL.length).includes(';')||
    !/^[a-f0-9]{64}$/.test(catalog.canonicalGuardSha256))fail('CANONICAL_QUERY_DRIFT');
 const prefix=catalog.original.slice(0,-EXPECTED_TAIL.length);
 return prefix+[
  'SELECT jsonb_build_object(',
  " 'capturedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),",
  " 'database',current_database(),'role',current_user,",
  " 'pgVersion',current_setting('server_version_num')::int,",
  " 'catalogCount',count(*),",
  " 'catalogMd5',md5(string_agg(k||E'\\t'||coalesce(v,'<NULL>'),E'\\n' ORDER BY k,v)),",
  " 'migrationLedger',(SELECT count(*) FROM supabase_migrations.schema_migrations),",
  " 'modernOfficeParticipants',to_regclass('public.office_thread_participants')::text",
  ') AS f6_u03t_readonly FROM object_defs;'
 ].join('\n')+'\n';
}
export function assessProvenance({projectRef,source,observed,original,now=Date.now()}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')
  fail('FOREIGN_PROJECT_OR_UNATTESTED_SOURCE');
 if(!original||original.sourceSetSha256!==SOURCE_78_SHA256||
    original.forwardCount!==31||original.originalCount!==78||
    original.hostedExecutionAuthorized!==false||original.originalGitSourceVerified!==true||
    !Array.isArray(original.paths)||original.paths.length!==31)
  fail('SOURCE_MANIFEST_INVALID');
 if(!observed||typeof observed!=='object'||Array.isArray(observed)||
    observed.database!=='postgres'||observed.role!=='postgres'||
    !Number.isInteger(observed.pgVersion)||Math.floor(observed.pgVersion/10000)!==17)
  fail('MANAGED_CATALOG_INVALID');
 const timestamp=Date.parse(observed.capturedAt);
 if(!Number.isFinite(timestamp)||!Number.isFinite(now)||timestamp>now+30000||now-timestamp>900000)
  fail('STALE_OR_FUTURE_MANAGED_OBSERVATION');
 if(!Number.isSafeInteger(observed.catalogCount)||typeof observed.catalogMd5!=='string'||
    !/^[a-f0-9]{32}$/.test(observed.catalogMd5)||
    !Number.isSafeInteger(observed.migrationLedger)||observed.migrationLedger<0||
    (observed.modernOfficeParticipants!==null&&typeof observed.modernOfficeParticipants!=='string'))
  fail('MALFORMED_CATALOG_OR_LEDGER');
 const blockers=[];
 const legacyCatalogMatches=observed.catalogCount===EXPECTED_OBJECT_COUNT&&observed.catalogMd5===HOSTED_RAW_MD5;
 if(!legacyCatalogMatches)blockers.push('HOSTED_0046_CATALOG_DRIFT');
 if(observed.migrationLedger!==0)blockers.push('HOSTED_MIGRATION_LEDGER_CHANGED_UNVERIFIED');
 if(observed.modernOfficeParticipants!==null)blockers.push('HOSTED_OFFICE_0048_ALREADY_PRESENT');
 blockers.push('0046_MANAGED_MIGRATION_PROVENANCE_UNATTESTED');
 blockers.push('OWNER_OFF_PLATFORM_DECRYPTION_KEY_UNCONFIRMED');
 blockers.push('SIGNED_SUPABASE_JWT_ALAP_PRO_JOURNEY_UNPROVEN');
 blockers.push('MANAGED_POSTGREST_TENANT_DENIAL_UNPROVEN');
 blockers.push('FULL_PROVIDER_AUTH_STORAGE_RECOVERY_UNPROVEN');
 return Object.freeze({
  contract:CONTRACT,scope:SCOPE,projectRef,observedAt:observed.capturedAt,
  originalSourceSetSha256:SOURCE_78_SHA256,forwardOriginalCount:31,
  knownHostedCatalog:{definitions:observed.catalogCount,md5:observed.catalogMd5,
   matchesKnownHistoricalHostSnapshot:legacyCatalogMatches,
   doesNotProveSourceMigrationLineage:true},
  migrationLedgerRows:observed.migrationLedger,
  decision:legacyCatalogMatches&&observed.migrationLedger===0&&observed.modernOfficeParticipants===null
   ?'BLOCKED_PROVENANCE_AND_PROVIDER_PROOF':'BLOCKED_MANAGED_CATALOG_DRIFT',
  blockers,hostedTouched:false,hostedMigrationExecuted:false,
  ledgerReconciled:false,providerSignedJwtProven:false,managedPostgrestProven:false,
  ownerKeyCustodyProven:false,releaseAuthorized:false
 });
}
function cli(){
 const args=process.argv.slice(2),out=resolve(OUTPUT);
 if(args.length!==2)fail('EXPLICIT_OFFLINE_ARGS_REQUIRED');
 if(args[0]==='--emit'&&resolve(args[1])===out){
  const original=buildBoundOriginalForwardSource(),sql=buildReadOnlyProvenanceSQL();
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'managed-catalog-readonly.sql'),sql);
  writeFileSync(join(out,'source-provenance.json'),JSON.stringify({
   scope:SCOPE,sourceSetSha256:original.sourceSetSha256,forwardCount:original.forwardCount,
   sqlSha256:createHash('sha256').update(sql).digest('hex'),hostedExecutionAuthorized:false,
   releaseAuthorized:false},null,2)+'\n');
  console.log(JSON.stringify({decision:'SOURCE_READY_FOR_INDEPENDENT_READ_ONLY_AUDIT',
   hostedExecutionAuthorized:false,originals:original.originalCount,forward:original.forwardCount}));
  return;
 }
 if(args[0]==='--assess'&&resolve(args[1])===join(out,'managed-observation.json')){
  const snap=JSON.parse(readFileSync(args[1],'utf8'));
  const report=assessProvenance({...snap,original:buildBoundOriginalForwardSource()});
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'readiness.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({decision:report.decision,releaseAuthorized:report.releaseAuthorized,
   blockers:report.blockers}));return;
 }
 fail('HOSTED_WRITE_OR_UNBOUNDED_CLI_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
