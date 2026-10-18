import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCandidateManifest,checkCandidateManifest} from './shoperation-f6-u03l-release-candidate-acl.mjs';
import {compile as compileOccupiedOriginalUpgrade} from './shoperation-f6-u03r-occupied-upgrade.mjs';

export const CONTRACT='shoporation.f6-u03s.managed-forward-readiness.v1';
export const SCOPE='EXACT_SOURCE_HOSTED_READONLY_PRE_RELEASE_NOT_PRODUCTION_PROOF';
export const PROJECT_REF='istjjkdcvsvilrycqecd';
export const SOURCE_78_SHA256='f570cbaa2cc6dea53bb123b8192c59335855c6e6227e48d0f564c4c85261b81e';
export const EXPECTED_CATALOG_MD5='e312b40ad91150ce937f4aa00db587f3';
export const OUTPUT='artifacts/f6-u03s/managed-forward-readiness';
export const HOSTED_SQL_EXECUTION_ENABLED=false;
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=reason=>{throw Error('F6U03S_'+reason)};
const prefix='-- F6U03I_ORIGINAL_SOURCE supabase/customer-baseline/migrations/0047_team_permissions_foundation_v1.sql';

export function buildBoundOriginalForwardSource({manifest=buildCandidateManifest(),occupied=compileOccupiedOriginalUpgrade()}={}){
 if(checkCandidateManifest(manifest)!==true||manifest.candidateSha256!==SOURCE_78_SHA256||
  occupied.manifest?.sourceSha256!==SOURCE_78_SHA256||occupied.manifest?.forward!==31||
  occupied.manifest?.releaseAuthorized!==false||occupied.manifest?.hostedTouched!==false)
  fail('SOURCE_78_UNBOUND');
 const suffix=manifest.sources.slice(47);
 if(suffix.length!==31||new Set(suffix.map(s=>s.path)).size!==31||
  suffix[0].path!=='supabase/customer-baseline/migrations/0047_team_permissions_foundation_v1.sql'||
  suffix.at(-1).path!=='supabase/customer-baseline/migrations/0058_digital_office_plan_scoped_sql_guard_v2.sql')
  fail('ORIGINAL_FORWARD_ORDER_CHANGED');
 const sql=occupied.upgrade;
 const first=sql.indexOf(prefix),end=sql.indexOf('-- ORIGINAL AUTH BOOTSTRAP',first);
 if(first<0||end<=first||sql.indexOf(prefix,first+1)!==-1)fail('MIGRATION_BOUNDARY_INVALID');
 const forwardSql=sql.slice(first,end);
 const markers=[...forwardSql.matchAll(/^-- (?:F6U03I_ORIGINAL_SOURCE|F6U03K_PINNED_ORIGINAL_MAIN_SOURCE) (.+\.sql)$/gm)]
   .map(x=>x[1]);
 if(JSON.stringify(markers)!==JSON.stringify(suffix.map(s=>s.path))||
  forwardSql.length<100000||
  forwardSql.includes('ORIGINAL TARGET PREFLIGHT')||
  forwardSql.includes('ORIGINAL TARGET POSTFLIGHT')||
  forwardSql.includes('F6U03R_WRONG_PG17_PEER')||
  forwardSql.includes('F6R_KEEP_CUSTOMER'))
  fail('HOSTED_RELEASE_SOURCE_CONTAMINATION');
 // The review file is deliberately NOT wrapped as executable SQL. The native
 // replay's local-only transaction guards are not reusable on managed Supabase.
 return Object.freeze({contract:'shoporation.f6-u03s.bound-forward-source.v1',scope:SCOPE,
  sourceSetSha256:SOURCE_78_SHA256,forwardCount:31,originalCount:78,
  originalForwardSqlSha256:sha(forwardSql),
  paths:suffix.map(x=>({ordinal:x.ordinal,path:x.path,gitBlob:x.gitBlob,sha256:x.sha256,sourceCommit:x.sourceCommit})),
  originalGitSourceVerified:true,hostedSqlGenerated:false,hostedExecutionAuthorized:false,hostedTouched:false});
}

export function buildReadOnlyManagedSQL(){
 return [
 '/* F6-U03s: read-only managed project catalog. Does NOT execute DDL or inspect private customer data. */',
 'SELECT jsonb_build_object(',
 " 'capturedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),",
 " 'database',current_database(),'role',current_user,'pgVersion',current_setting('server_version_num')::int,",
 " 'publicTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p') AND NOT c.relispartition),",
 " 'privateTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relkind IN('r','p') AND NOT c.relispartition),",
 " 'authUsers',(SELECT count(*) FROM auth.users),'authMfa',(SELECT count(*) FROM auth.mfa_factors),",
 " 'authIdentities',(SELECT count(*) FROM auth.identities),'authSessions',(SELECT count(*) FROM auth.sessions),",
 " 'storageObjects',(SELECT count(*) FROM storage.objects),'migrationLedger',(SELECT count(*) FROM supabase_migrations.schema_migrations),",
 " 'organizations',(SELECT count(*) FROM public.organizations),'tenants',(SELECT count(*) FROM public.webshop_instances),",
 " 'threads',(SELECT count(*) FROM public.office_threads),'messages',(SELECT count(*) FROM public.office_messages),'tasks',(SELECT count(*) FROM public.office_tasks),",
 " 'neutralRows',(SELECT count(*) FROM public.addon_capability_grants)+(SELECT count(*) FROM public.addon_entitlement_catalog)+",
 " (SELECT count(*) FROM public.addon_plan_compatibility)+(SELECT count(*) FROM public.entitlement_capabilities)+",
 " (SELECT count(*) FROM public.entitlement_source_precedence)+(SELECT count(*) FROM public.plan_capability_grants)+",
 " (SELECT count(*) FROM public.subscription_plan_catalog),",
 " 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit) ORDER BY id) FROM storage.buckets),",
 " 'events',(SELECT jsonb_agg(jsonb_build_object('name',evtname,'enabled',evtenabled) ORDER BY evtname) FROM pg_event_trigger),",
 " 'legacyPolicies',(SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_policies WHERE schemaname='public' AND policyname IN ('office_threads_store_all','office_messages_store_all','office_tasks_store_all')),",
 " 'authUserTrigger',(SELECT count(*) FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='on_auth_user_created' AND tgisinternal=false AND tgfoid='private.handle_new_user()'::regprocedure),",
 " 'modernParticipants',to_regclass('public.office_thread_participants')::text,",
 " 'modernOfficeHelper',to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)')::text",
 ') AS f6_u03s_readonly;'
 ].join('\n')+'\n';
}

export function assessManagedReadiness({projectRef,source,observed,original,backup,ownerKeyCustodyConfirmed=false}={}){
 if(projectRef!==PROJECT_REF||source!=='connected-supabase-readonly')fail('WRONG_PROJECT_OR_UNTRUSTED_SOURCE');
 if(!observed||typeof observed!=='object'||Array.isArray(observed)||observed.database!=='postgres'||observed.role!=='postgres'||
  !Number.isInteger(observed.pgVersion)||Math.floor(observed.pgVersion/10000)!==17||
  !Number.isFinite(Date.parse(observed.capturedAt)))fail('INVALID_MANAGED_OBSERVATION');
 if(!original||original.sourceSetSha256!==SOURCE_78_SHA256||original.forwardCount!==31||
  original.originalCount!==78||original.hostedExecutionAuthorized!==false||
  original.originalGitSourceVerified!==true||
  !Array.isArray(original.paths)||original.paths.length!==31)
  fail('SOURCE_PROVENANCE_INVALID');
 if(!backup||backup.projectRef!==PROJECT_REF||backup.localPg17Restore!==true||
  backup.restoredCatalogRows!==113||backup.hostedMutation!==false||
  backup.releaseAuthorized!==false||!/^[a-f0-9]{64}$/.test(backup.ciphertextSha256||''))
  fail('BACKUP_EVIDENCE_UNTRUSTED');
 const blockers=[],eq=(key,value,code)=>{
  if(observed[key]!==value)blockers.push(code||'HOSTED_0046_DRIFT:'+key);
 };
 for(const [key,v] of Object.entries({publicTables:175,privateTables:2,authUsers:0,authMfa:0,authIdentities:0,authSessions:0,
 storageObjects:0,migrationLedger:0,organizations:0,tenants:0,threads:0,messages:0,tasks:0,neutralRows:113,
 authUserTrigger:1,modernParticipants:null,modernOfficeHelper:null}))eq(key,v);
 const expectedBuckets=['digital-products-private','order-documents-private','product-documents-private','product-media'];
 if(!Array.isArray(observed.buckets)||observed.buckets.length!==4||
  JSON.stringify(observed.buckets.map(x=>x.id).sort())!==JSON.stringify(expectedBuckets.slice().sort())||
  observed.buckets.filter(x=>x.public===true).length!==1)
  blockers.push('MANAGED_STORAGE_BUCKETS_DRIFT');
 const expectedEvents=['issue_graphql_placeholder','issue_pg_cron_access','issue_pg_graphql_access',
 'issue_pg_net_access','pgrst_ddl_watch','pgrst_drop_watch'];
 if(!Array.isArray(observed.events)||observed.events.length!==6||
  JSON.stringify(observed.events.map(x=>x.name).sort())!==JSON.stringify(expectedEvents.slice().sort())||
  observed.events.some(x=>x.enabled!=='O'))blockers.push('MANAGED_PROVIDER_EVENTS_DRIFT');
 if(!Array.isArray(observed.legacyPolicies)||
  JSON.stringify(observed.legacyPolicies)!==JSON.stringify(['office_messages','office_tasks','office_threads']))
  blockers.push('LEGACY_OFFICE_POLICY_IDENTITY_DRIFT');
 if(!ownerKeyCustodyConfirmed)blockers.push('OWNER_OFF_PLATFORM_KEY_RETENTION_UNCONFIRMED');
 // An empty Supabase ledger with 0046 tables cannot be retroactively certified as
 // a 78-source migration provenance. Signed provider data journeys are separate.
 blockers.push('MANAGED_MIGRATION_LEDGER_PROVENANCE_UNATTESTED');
 blockers.push('SIGNED_SUPABASE_AUTH_JWT_UNPROVEN');
 blockers.push('MANAGED_POSTGREST_ALAP_PRO_TENANT_JOURNEY_UNPROVEN');
 blockers.push('MANAGED_AUTH_STORAGE_FULL_RECOVERY_UNPROVEN');
 return Object.freeze({contract:CONTRACT,scope:SCOPE,projectRef,observedAt:observed.capturedAt,
  sourceSha256:original.sourceSetSha256,forwardCount:31,sourceAuditSha256:original.originalForwardSqlSha256,
  backupCiphertextSha256:backup.ciphertextSha256,legacySchemaConsistent:!blockers.some(x=>/DRIFT/.test(x)),
  ownerKeyCustodyConfirmed,blockers,decision:'BLOCKED_RELEASE_PREREQUISITES',
  hostedMigrationExecuted:false,providerJwtProven:false,managedApiProven:false,
  fullSupabaseRecoveryProven:false,releaseAuthorized:false});
}

function cli(){
 const args=process.argv.slice(2);
 if(args.length!==2)fail('EXPLICIT_OFFLINE_CLI_ONLY');
 if(args[0]==='--emit'&&resolve(args[1])===resolve(OUTPUT)){
  mkdirSync(resolve(OUTPUT),{recursive:true});
  const original=buildBoundOriginalForwardSource();
  writeFileSync(join(resolve(OUTPUT),'original-forward-source.json'),JSON.stringify(original,null,2)+'\n');
  writeFileSync(join(resolve(OUTPUT),'managed-readonly.sql'),buildReadOnlyManagedSQL());
  console.log(JSON.stringify({decision:'SOURCE_BOUND_READONLY_ONLY',forward:original.forwardCount,
   sourceAuditSha256:original.originalForwardSqlSha256,hostedExecutionAuthorized:false}));
  return;
 }
 if(args[0]==='--assess'&&resolve(args[1])===resolve(OUTPUT+'/managed-observation.json')){
  const snap=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
  const report=assessManagedReadiness({...snap,original:buildBoundOriginalForwardSource()});
  writeFileSync(join(resolve(OUTPUT),'release-readiness.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));return;
 }
 fail('HOSTED_EXECUTION_FORBIDDEN');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{cli()}catch(e){console.error(String(e.message));process.exitCode=1}
}