import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// F6-U03d is an offline source-level verifier. It never connects to PostgreSQL.
export const TARGET_PROJECT_REF='istjjkdcvsvilrycqecd';
export const RESET_EXECUTION_ENABLED=false;
export const SCOPE='READ_ONLY_MANAGED_DEPENDENCY_AND_ACL';
export const EXPECTED_SCHEMAS=Object.freeze({
 private:{owner:'postgres',acl:['postgres=UC/postgres','authenticated=U/postgres','service_role=U/postgres']},
 public:{owner:'postgres',acl:['postgres=UC/postgres','anon=U/postgres','authenticated=U/postgres','service_role=UC/postgres','supabase_admin=UC/postgres']},
});
export const EXPECTED_EVENTS=Object.freeze([
 ['issue_graphql_placeholder','sql_drop','set_graphql_placeholder()'],
 ['issue_pg_cron_access','ddl_command_end','grant_pg_cron_access()'],
 ['issue_pg_graphql_access','ddl_command_end','grant_pg_graphql_access()'],
 ['issue_pg_net_access','ddl_command_end','grant_pg_net_access()'],
 ['pgrst_ddl_watch','ddl_command_end','pgrst_ddl_watch()'],
 ['pgrst_drop_watch','sql_drop','pgrst_drop_watch()'],
]);
const blocked=id=>{throw new Error(id);};
const sorted=a=>[...a].sort();
export const READ_ONLY_SQL="WITH deps AS (\n SELECT d.classid,d.objid,d.deptype,\n pg_describe_object(d.classid,d.objid,d.objsubid) AS dependent,\n pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced,\n COALESCE(\n  (SELECT n.nspname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_trigger'::regclass AND t.oid=d.objid),\n  (SELECT n.nspname FROM pg_rewrite rw JOIN pg_class c ON c.oid=rw.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_rewrite'::regclass AND rw.oid=d.objid),\n  (SELECT n.nspname FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_constraint'::regclass AND co.oid=d.objid),\n  (SELECT n.nspname FROM pg_attrdef ad JOIN pg_class c ON c.oid=ad.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_attrdef'::regclass AND ad.oid=d.objid),\n  (SELECT n.nspname FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_policy'::regclass AND pol.oid=d.objid),\n  (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE d.classid='pg_class'::regclass AND c.oid=d.objid),\n  (SELECT n.nspname FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE d.classid='pg_proc'::regclass AND f.oid=d.objid),\n  (SELECT n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE d.classid='pg_type'::regclass AND t.oid=d.objid),\n  (SELECT n.nspname FROM pg_namespace n WHERE d.classid='pg_namespace'::regclass AND n.oid=d.objid),\n  '?') AS owner_schema\n FROM pg_depend d\n WHERE d.deptype IN ('n','a')\n AND (\n (d.refclassid='pg_proc'::regclass AND d.refobjid IN(SELECT f.oid FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname IN('public','private')))\n OR(d.refclassid='pg_class'::regclass AND d.refobjid IN(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','private')))\n OR(d.refclassid='pg_type'::regclass AND d.refobjid IN(SELECT t.oid FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN('public','private')))\n OR(d.refclassid='pg_namespace'::regclass AND d.refobjid IN(SELECT oid FROM pg_namespace WHERE nspname IN('public','private')))\n )\n), external AS (\n SELECT owner_schema,classid::regclass::text AS dependent_class,dependent,referenced,deptype\n FROM deps WHERE owner_schema NOT IN ('public','private','pg_toast')\n)\nSELECT jsonb_build_object(\n'database',current_database(),'dbRole',current_user,'serverMajor',current_setting('server_version_num')::integer/10000,\n'publicTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p') AND NOT c.relispartition),\n'privateTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relkind IN('r','p') AND NOT c.relispartition),\n'authUsers',(SELECT count(*) FROM auth.users),'authIdentities',(SELECT count(*) FROM auth.identities),'authSessions',(SELECT count(*) FROM auth.sessions),\n'storageObjects',(SELECT count(*) FROM storage.objects),'storageBuckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit) ORDER BY id) FROM storage.buckets),\n'migrationHistory',(SELECT count(*) FROM supabase_migrations.schema_migrations),\n'schemaGrants',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl) ORDER BY nspname) FROM pg_namespace WHERE nspname IN('public','private')),\n'externalDependencies',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner_schema',owner_schema,'dependent_class',dependent_class,'dependent',dependent,'referenced',referenced,'deptype',deptype) ORDER BY owner_schema,dependent),'[]'::jsonb) FROM external),\n'eventTriggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,'owner',pg_get_userbyid(p.proowner),'schema',n.nspname,'enabled',e.evtenabled,'function',e.evtfoid::regprocedure::text) ORDER BY e.evtname),'[]'::jsonb)\nFROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid JOIN pg_namespace n ON n.oid=p.pronamespace)\n) AS f6_u03d_readonly_snapshot;";

export function validateReadOnlySnapshot(s,{connectorProjectRef}={}){
 if(connectorProjectRef!==TARGET_PROJECT_REF)blocked('F6U03D_WRONG_CONNECTOR_PROJECT');
 if(!s||typeof s!=='object')blocked('F6U03D_SNAPSHOT_REQUIRED');
 for(const [key,val] of Object.entries({
  database:'postgres',dbRole:'postgres',serverMajor:17,publicTables:175,privateTables:2,
  authUsers:0,authIdentities:0,authSessions:0,storageObjects:0,migrationHistory:0,
 }))if(s[key]!==val)blocked('F6U03D_TARGET_DRIFT:'+key);
 if(!Array.isArray(s.schemaGrants)||s.schemaGrants.length!==2)blocked('F6U03D_SCHEMA_GRANTS_MISSING');
 for(const [schema,expected] of Object.entries(EXPECTED_SCHEMAS)){
  const x=s.schemaGrants.find(v=>v?.name===schema);
  if(!x||x.owner!==expected.owner||!Array.isArray(x.acl)
    ||new Set(x.acl).size!==expected.acl.length
    ||JSON.stringify(sorted(x.acl))!==JSON.stringify(sorted(expected.acl)))
    blocked('F6U03D_SCHEMA_ACL_DRIFT:'+schema);
 }
 if(!Array.isArray(s.externalDependencies)||s.externalDependencies.length!==1)
   blocked('F6U03D_EXTERNAL_DEPENDENCY_DRIFT');
 const d=s.externalDependencies[0];
 if(d.owner_schema!=='auth'||d.dependent_class!=='pg_trigger'||d.deptype!=='n'
  ||d.dependent!=='trigger on_auth_user_created on table auth.users'
  ||d.referenced!=='function private.handle_new_user()')
   blocked('F6U03D_EXTERNAL_DEPENDENCY_UNEXPECTED');
 if(!Array.isArray(s.eventTriggers)||s.eventTriggers.length!==6)
   blocked('F6U03D_EVENT_TRIGGER_SET_DRIFT');
 for(const [name,event,fn] of EXPECTED_EVENTS){
  const a=s.eventTriggers.find(v=>v?.name===name);
  if(!a||a.event!==event||a.function!==fn||a.schema!=='extensions'
    ||a.enabled!=='O'||a.owner!=='supabase_admin')
    blocked('F6U03D_EVENT_TRIGGER_DRIFT:'+name);
 }
 const buckets=[
  ['digital-products-private',false,2147483648],
  ['order-documents-private',false,26214400],
  ['product-documents-private',false,26214400],
  ['product-media',true,8388608],
 ];
 if(!Array.isArray(s.storageBuckets)||s.storageBuckets.length!==4)
   blocked('F6U03D_STORAGE_BUCKET_SET_DRIFT');
 for(const [id,pub,limit] of buckets)
  if(!s.storageBuckets.some(b=>b?.id===id&&b.public===pub&&b.limit===limit))
    blocked('F6U03D_STORAGE_BUCKET_DRIFT:'+id);
 return Object.freeze({
  contract:'shoperation.f6-u03d.managed-preflight.v1',decision:'REVIEW_ONLY',scope:SCOPE,
  projectRef:TARGET_PROJECT_REF,knownExternalDependencyCount:1,schemaGrantSetCount:2,
  eventTriggerCount:6,resetEligible:false,hostedExecutionEnabled:RESET_EXECUTION_ENABLED,
  actualCustomerMigrationsApplied:0,remainingBlockers:[
   'IN_TRANSACTION_RECHECK_AND_LOCK_NOT_PROVED',
   'SCHEMA_ACL_REGRANT_NOT_IMPLEMENTED',
   'EVENT_TRIGGER_DDL_EFFECTS_NOT_PROVED',
   '59_FILE_HOSTED_REPLAY_NOT_PROVED',
   'ALAP_PRO_SIGNED_IN_RLS_NOT_PROVED',
  ],
 });
}
export function offlineReviewContract(){
 if(!READ_ONLY_SQL.trimStart().startsWith('WITH deps AS')
  ||/;\s*(?:DROP|CREATE|ALTER|GRANT|REVOKE|DELETE|TRUNCATE|UPDATE|INSERT)\b/i.test(READ_ONLY_SQL))
   blocked('F6U03D_QUERY_NOT_READ_ONLY');
 return Object.freeze({
  contract:'shoperation.f6-u03d.managed-preflight.v1',scope:SCOPE,decision:'REVIEW_ONLY',
  projectRef:TARGET_PROJECT_REF,querySha256:createHash('sha256').update(READ_ONLY_SQL).digest('hex'),
  hostedConnectionUsed:false,resetEligible:false,actualCustomerMigrationsApplied:0,
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2).join(' ');
 if(args==='--offline-review')console.log(JSON.stringify(offlineReviewContract(),null,2));
 else if(args==='--print-readonly-sql')console.log(READ_ONLY_SQL);
 else{console.error('F6U03D_NO_DATABASE_EXECUTION_PATH');process.exitCode=1;}
}
