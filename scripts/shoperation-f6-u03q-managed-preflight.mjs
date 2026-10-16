import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const SCOPE='MANAGED_SUPABASE_READ_ONLY_CATALOG_NOT_PROVIDER_AUTH_API_PROOF';
export const CONTRACT='shoporation.f6-u03q.readonly-office-catalog.v1';
export const EXPECTED_FRESH_REF='istjjkdcvsvilrycqecd';
export const OUTPUT='artifacts/f6-u03q/managed-office-readiness';
export const OFFICE_TABLES=Object.freeze(['office_threads','office_messages','office_tasks']);
export const PRIVACY_HELPERS=Object.freeze([
 'public.can_read_office_thread_v1',
 'private.current_user_can_read_office_thread_v1',
 'private.office_effective_feature_enabled_v1'
]);
const fail=(m)=>{throw new Error(m)};
const unique=(items,name)=>{if(new Set(items).size!==items.length)fail('F6U03Q_DUPLICATE_'+name)};
const isBoolean=v=>typeof v==='boolean';

export function buildManagedCatalogSQL(){
 return [
  '-- F6-U03q: metadata-only managed Supabase Office preflight. No tenant row data.',
  '-- This SQL is a read-only catalog snapshot, never a signed JWT or PostgREST proof.',
  'SELECT jsonb_build_object(',
  " 'contract','shoporation.f6-u03q.readonly-office-catalog.v1',",
  ` 'capturedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),`,
  " 'database',current_database(),",
  " 'serverVersionNum',current_setting('server_version_num')::int,",
  " 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',c.relname,",
  "   'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,",
  "   'authenticatedSelect',has_table_privilege('authenticated',c.oid,'SELECT'),",
  "   'anonSelect',has_table_privilege('anon',c.oid,'SELECT')) ORDER BY c.relname),'[]'::jsonb)",
  "   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
  "   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname IN",
  "    ('office_threads','office_messages','office_tasks','office_thread_participants',",
  "     'role_bindings','feature_entitlements','webshop_instances')),",
  " 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',tablename,",
  "   'policy',policyname,'command',cmd,'roles',roles) ORDER BY tablename,policyname),'[]'::jsonb)",
  "   FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN",
  "    ('office_threads','office_messages','office_tasks','office_thread_participants')),",
  " 'helperSignatures',(SELECT coalesce(jsonb_agg(format('%I.%I(%s)',",
  "    n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))",
  "    ORDER BY n.nspname,p.proname),'[]'::jsonb)",
  "   FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace",
  "   WHERE n.nspname IN ('public','private')",
  "   AND p.proname IN ('can_read_office_thread_v1',",
  "    'current_user_can_read_office_thread_v1','office_effective_feature_enabled_v1'))",
  ') AS audit;'
 ].join('\n')+'\n';
}

export function assessManagedCatalog({projectRef,source,observation,migrationLedger}={}){
 if(projectRef!==EXPECTED_FRESH_REF)fail('F6U03Q_WRONG_FRESH_PROJECT');
 if(source!=='managed-supabase-catalog-readonly')fail('F6U03Q_UNATTESTED_CATALOG_SOURCE');
 if(!observation||typeof observation!=='object'||Array.isArray(observation))
  fail('F6U03Q_CATALOG_REQUIRED');
 if(observation.contract!==CONTRACT||!Number.isInteger(observation.serverVersionNum)||
  Math.floor(observation.serverVersionNum/10000)!==17||observation.database!=='postgres')
  fail('F6U03Q_WRONG_CONTRACT_OR_NATIVE_POSTGRES');
 if(typeof observation.capturedAt!=='string'||!Number.isFinite(Date.parse(observation.capturedAt)))
  fail('F6U03Q_MANAGED_OBSERVATION_TIME_REQUIRED');
 if(!Array.isArray(observation.objects)||!Array.isArray(observation.policies)||
  !Array.isArray(observation.helperSignatures)||!Array.isArray(migrationLedger))
  fail('F6U03Q_INCOMPLETE_CATALOG');
 if(observation.objects.some(x=>!x||typeof x.relation!=='string'||
    !isBoolean(x.rls)||!isBoolean(x.forceRls)||!isBoolean(x.authenticatedSelect)||!isBoolean(x.anonSelect)))
  fail('F6U03Q_INVALID_CATALOG_OBJECT');
 if(observation.policies.some(x=>!x||typeof x.table!=='string'||typeof x.policy!=='string'||
  typeof x.command!=='string'||!Array.isArray(x.roles)))
  fail('F6U03Q_INVALID_POLICY');
 if(observation.helperSignatures.some(x=>typeof x!=='string')||
  migrationLedger.some(x=>typeof x!=='string'&&!(x&&typeof x.version==='string')))
  fail('F6U03Q_INVALID_SOURCE_PROVENANCE');
 unique(observation.objects.map(x=>x.relation),'OBJECT');
 unique(observation.policies.map(x=>x.table+'/'+x.policy),'POLICY');
 unique(observation.helperSignatures,'HELPER');
 const byName=new Map(observation.objects.map(x=>[x.relation,x]));
 const blockers=[];
 for(const name of OFFICE_TABLES){
  const table=byName.get(name);
  if(!table){blockers.push('OFFICE_TABLE_MISSING:'+name);continue}
  if(!table.rls)blockers.push('OFFICE_RLS_DISABLED:'+name);
  if(!table.authenticatedSelect)blockers.push('DIRECT_AUTHENTICATED_SELECT_DENIED:'+name);
 }
 if(!byName.get('office_thread_participants'))
  blockers.push('OFFICE_PARTICIPANTS_MISSING');
 for(const p of observation.policies)
  if(OFFICE_TABLES.includes(p.table)&&/^office_(?:threads|messages|tasks)_store_all$/.test(p.policy))
   blockers.push('LEGACY_STORE_ALL_POLICY:'+p.table);
 for(const name of PRIVACY_HELPERS)
  if(!observation.helperSignatures.some(x=>x.startsWith(name+'(')))
   blockers.push('PRIVACY_HELPER_MISSING:'+name);
 if(migrationLedger.length===0)blockers.push('MANAGED_MIGRATION_LEDGER_EMPTY');
 // A populated unverified ledger is still not an attestation of 78 original Git source blobs.
 blockers.push('ORDERED_78_SOURCE_PROVENANCE_UNATTESTED');
 blockers.push('SIGNED_SUPABASE_AUTH_JWT_UNPROVEN');
 blockers.push('MANAGED_POSTGREST_HTTP_UNPROVEN');
 blockers.push('AUTHENTICATED_ALAP_PRO_TENANT_JOURNEY_UNPROVEN');
 blockers.push('MANAGED_STORAGE_UNPROVEN');
 const schemaFailures=blockers.filter(x=>/^(OFFICE_|DIRECT_|LEGACY_|PRIVACY_)/.test(x));
 const decision=schemaFailures.length?'BLOCKED_MANAGED_OFFICE_SCHEMA':
  'SCHEMA_CANDIDATE_ONLY_PROVIDER_AUTH_API_BLOCKED';
 return {
  contract:'shoporation.f6-u03q.managed-office-readiness.v1',
  projectRef,observedAt:observation.capturedAt,postgresMajor:17,
  scope:SCOPE,decision,readOnlyCatalogEvaluated:true,
  officeRelationCount:OFFICE_TABLES.filter(x=>byName.has(x)).length,
  sourceMigrationCount:migrationLedger.length,
  schemaFailures,blockers:[...new Set(blockers)],
  actualProviderSignedJwtProven:false,actualManagedPostgrestHttpProven:false,
  actualAuthenticatedAlapProJourneyProven:false,managedStorageProven:false,
  source78InstalledInHostedProven:false,releaseAuthorized:false,
  hostedMutationPerformed:false,
  provenanceCaveat:'Caller-supplied catalog must be independently tied to a current managed project; SQL-only metadata does not attest HTTP/JWT or migration provenance.'
 };
}
function cli(){
 const [action,destination]=process.argv.slice(2);
 if(process.argv.length!==4||!destination)fail('F6U03Q_EXPLICIT_LOCAL_ARTIFACT_PATH_REQUIRED');
 const output=resolve(OUTPUT);
 if(action==='--emit-readonly-sql'&&resolve(destination)===resolve(OUTPUT+'/catalog.sql')){
  mkdirSync(output,{recursive:true});
  writeFileSync(resolve(destination),buildManagedCatalogSQL());return;
 }
 if(action==='--assess-readonly-snapshot'&&resolve(destination)===resolve(OUTPUT+'/snapshot.json')){
  const result=assessManagedCatalog(JSON.parse(readFileSync(resolve(destination),'utf8')));
  mkdirSync(output,{recursive:true});
  writeFileSync(resolve(output+'/readiness.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));return;
 }
 fail('F6U03Q_HOSTED_WRITE_OR_UNAPPROVED_CLI_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(e.message);process.exitCode=1}
}
