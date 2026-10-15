import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {READ_ONLY_SQL,EXPECTED_SCHEMAS,EXPECTED_EVENTS,TARGET_PROJECT_REF} from './shoperation-f6-u03d-managed-preflight.mjs';
import {SUPABASE_PROVIDER_FUNCTION_MD5} from './shoperation-f6-u03e-schema-restore.mjs';

// F6-U03f is a SOURCE-ONLY transaction-local safety candidate. No DB runner.
export const HOSTED_EXECUTION_ENABLED=false;
export const PROOF_SCOPE='SOURCE_ONLY_TRANSACTION_GUARD';
export const NEUTRAL_ROWS=Object.freeze({"addon_capability_grants":[4,"603e4da6e9b73f18f08de9b648c8d140"],"addon_entitlement_catalog":[4,"ab9929cc98f52e790627f7f29e5e6cea"],"addon_plan_compatibility":[7,"52e8cd3fc13054647ffbcc11f57005a0"],"entitlement_capabilities":[38,"b0837c65a65b17613030b647e74764f5"],"entitlement_source_precedence":[5,"c60294237cba6a8100c39eae1ed7c29b"],"plan_capability_grants":[53,"c0d071de44955a6eb0225bd86159f37d"],"subscription_plan_catalog":[2,"cb1a33c97779af7bb0e009b1ba650410"]});
const escape=x=>"'"+String(x).replaceAll("'","''")+"'";
const reject=x=>{throw new Error(x);};
const TEMPLATE="DO $f6_guard$\nDECLARE rec record; state jsonb; n bigint; hash text; expected_count bigint; expected_hash text; neutral_total bigint:=0;\nBEGIN\n  IF current_database()<>'postgres' OR current_user<>'postgres'\n    OR current_setting('server_version_num')::integer/10000<>17\n    THEN RAISE EXCEPTION 'F6U03F_DB_ROLE_VERSION_DRIFT'; END IF;\n  IF NOT pg_try_advisory_xact_lock(118603,6)\n    THEN RAISE EXCEPTION 'F6U03F_LOCK_BUSY'; END IF;\n  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace\n      WHERE ns.nspname='public' AND c.relkind IN('r','p') AND NOT c.relispartition)<>175\n    OR (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace\n      WHERE ns.nspname='private' AND c.relkind IN('r','p') AND NOT c.relispartition)<>2\n    THEN RAISE EXCEPTION 'F6U03F_APP_RELATION_SET_CHANGED'; END IF;\n  FOR rec IN SELECT ns.nspname AS sch,c.relname AS tbl FROM pg_class c\n    JOIN pg_namespace ns ON ns.oid=c.relnamespace\n    WHERE ns.nspname IN('public','private')\n      AND c.relkind IN('r','p') AND NOT c.relispartition\n    ORDER BY ns.nspname,c.relname LOOP\n    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE NOWAIT',rec.sch,rec.tbl);\n  END LOOP;\n  EXECUTE $f6_snapshot$@@SNAPSHOT_SQL@@$f6_snapshot$ INTO state;\n  IF state IS NULL OR state->>'database'<>'postgres' OR state->>'dbRole'<>'postgres'\n    OR (state->>'serverMajor')::int<>17\n    OR (state->>'publicTables')::int<>175 OR (state->>'privateTables')::int<>2\n    OR (state->>'authUsers')::int<>0 OR (state->>'authIdentities')::int<>0\n    OR (state->>'authSessions')::int<>0 OR (state->>'storageObjects')::int<>0\n    OR (state->>'migrationHistory')::int<>0\n    THEN RAISE EXCEPTION 'F6U03F_MANAGED_SNAPSHOT_DRIFT'; END IF;\n  IF EXISTS(SELECT 1 FROM auth.mfa_factors)\n    OR EXISTS(SELECT 1 FROM storage.s3_multipart_uploads)\n    OR EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace ns ON ns.oid=e.extnamespace\n      WHERE ns.nspname IN('public','private'))\n    THEN RAISE EXCEPTION 'F6U03F_EXTRA_MANAGED_STATE'; END IF;\n  IF jsonb_array_length(state->'schemaGrants')<>2\n    OR jsonb_array_length(state->'externalDependencies')<>1\n    OR jsonb_array_length(state->'eventTriggers')<>6\n    OR jsonb_array_length(state->'storageBuckets')<>4\n    THEN RAISE EXCEPTION 'F6U03F_MANAGED_OBJECT_SET_DRIFT'; END IF;\n  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(state->'externalDependencies') e(v)\n    WHERE v->>'owner_schema'='auth' AND v->>'dependent_class'='pg_trigger'\n    AND v->>'deptype'='n'\n    AND v->>'dependent'='trigger on_auth_user_created on table auth.users'\n    AND v->>'referenced'='function private.handle_new_user()')\n    THEN RAISE EXCEPTION 'F6U03F_CROSS_SCHEMA_DEPENDENCY_DRIFT'; END IF;\n  @@ACL_CHECKS@@\n  @@EVENT_CHECKS@@\n  IF NOT EXISTS(SELECT 1 FROM pg_trigger t\n    JOIN pg_class c ON c.oid=t.tgrelid\n    JOIN pg_namespace ns ON ns.oid=c.relnamespace\n    WHERE ns.nspname='auth' AND c.relname='users'\n      AND t.tgname='on_auth_user_created'\n      AND t.tgfoid='private.handle_new_user()'::regprocedure\n      AND NOT t.tgisinternal)\n    THEN RAISE EXCEPTION 'F6U03F_AUTH_TRIGGER_DRIFT'; END IF;\n  IF (SELECT count(*) FROM storage.buckets)<>4\n    OR (SELECT count(*) FROM storage.buckets\n       WHERE (id='digital-products-private' AND NOT public AND file_size_limit=2147483648)\n         OR (id='order-documents-private' AND NOT public AND file_size_limit=26214400)\n         OR (id='product-documents-private' AND NOT public AND file_size_limit=26214400)\n         OR (id='product-media' AND public AND file_size_limit=8388608))<>4\n    THEN RAISE EXCEPTION 'F6U03F_STORAGE_BUCKET_DRIFT'; END IF;\n  FOR rec IN SELECT ns.nspname AS sch,c.relname AS tbl FROM pg_class c\n    JOIN pg_namespace ns ON ns.oid=c.relnamespace\n    WHERE ns.nspname IN('public','private')\n      AND c.relkind IN('r','p') AND NOT c.relispartition\n    ORDER BY ns.nspname,c.relname LOOP\n    EXECUTE format('SELECT count(*),md5(coalesce(string_agg(to_jsonb(x)::text,E''\\n'' ORDER BY to_jsonb(x)::text),'''')) FROM %I.%I x',rec.sch,rec.tbl)\n      INTO n,hash;\n    IF rec.sch='public' AND rec.tbl=ANY(ARRAY[\n      'addon_capability_grants','addon_entitlement_catalog','addon_plan_compatibility',\n      'entitlement_capabilities','entitlement_source_precedence',\n      'plan_capability_grants','subscription_plan_catalog'])\n    THEN\n      CASE rec.tbl\n      @@NEUTRAL_CASES@@\n      ELSE RAISE EXCEPTION 'F6U03F_UNRECOGNIZED_NEUTRAL_CATALOG'; END CASE;\n      IF n<>expected_count OR hash<>expected_hash\n        THEN RAISE EXCEPTION 'F6U03F_NEUTRAL_CATALOG_HASH_DRIFT: %',rec.tbl; END IF;\n      neutral_total:=neutral_total+n;\n    ELSIF n<>0 THEN\n      RAISE EXCEPTION 'F6U03F_APPLICATION_USER_DATA_PRESENT: %.%',rec.sch,rec.tbl;\n    END IF;\n  END LOOP;\n  IF neutral_total<>113 THEN RAISE EXCEPTION 'F6U03F_CATALOG_ROW_TOTAL_DRIFT'; END IF;\n  -- A full schema-definition hash and live project endpoint/TLS identity remain\n  -- separate BLOCKING proof obligations: this guard does not grant reset authority.\nEND $f6_guard$;";

const grantChecks=Object.entries(EXPECTED_SCHEMAS).map(([name,s])=>
 "IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(state->'schemaGrants') AS x(v) "+
 "WHERE v->>'name'="+escape(name)+" AND v->>'owner'="+escape(s.owner)+
 " AND jsonb_array_length(v->'acl')="+s.acl.length+
 " AND v->'acl' @> "+escape(JSON.stringify(s.acl))+"::jsonb) "+
 "THEN RAISE EXCEPTION 'F6U03F_SCHEMA_ACL_DRIFT:"+name+"'; END IF;"
).join('\n');
const eventChecks=EXPECTED_EVENTS.map(([name,event,fn])=>{
 const md5=SUPABASE_PROVIDER_FUNCTION_MD5[name];
 if(!md5)reject('F6U03F_EVENT_MD5_MISSING:'+name);
 return "IF NOT EXISTS(SELECT 1 FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid "+
 "JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE e.evtname="+escape(name)+
 " AND e.evtevent="+escape(event)+" AND e.evtenabled='O' "+
 "AND ns.nspname='extensions' AND pg_get_userbyid(p.proowner)='supabase_admin' "+
 "AND md5(pg_get_functiondef(p.oid))="+escape(md5)+") "+
 "THEN RAISE EXCEPTION 'F6U03F_MANAGED_EVENT_DRIFT:"+name+"'; END IF;";
}).join('\n');
const neutralCases=Object.entries(NEUTRAL_ROWS).map(([name,[count,md5]])=>
 "WHEN "+escape(name)+" THEN expected_count:="+count+";expected_hash:="+escape(md5)+";"
).join('\n');
export const TRANSACTION_GUARD_SQL=TEMPLATE
 .replace('@@SNAPSHOT_SQL@@',READ_ONLY_SQL.trim().replace(/;\s*$/,''))
 .replace('@@ACL_CHECKS@@',grantChecks)
 .replace('@@EVENT_CHECKS@@',eventChecks)
 .replace('@@NEUTRAL_CASES@@',neutralCases);
export function compileReviewGuard(){
 if(!TRANSACTION_GUARD_SQL.startsWith('DO $f6_guard$')
 || !TRANSACTION_GUARD_SQL.includes('ACCESS EXCLUSIVE MODE NOWAIT')
 || TRANSACTION_GUARD_SQL.includes('@@'))
 reject('F6U03F_SOURCE_GUARD_INCOMPLETE');
 return Object.freeze({
  contract:'shoperation.f6-u03f.target-guard.v1',scope:PROOF_SCOPE,
  projectRef:TARGET_PROJECT_REF,sqlSha256:createHash('sha256').update(TRANSACTION_GUARD_SQL).digest('hex'),
  expectedApplicationTableCount:177,neutralCatalogs:7,
  hostedExecutionEnabled:HOSTED_EXECUTION_ENABLED,hostedDatabaseTouched:false,
  projectTLSIdentityProven:false,fullObjectFingerprintProven:false,
  liveTransactionalGuardProven:false,hosted59MigrationsProven:false,
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.slice(2).join(' ')==='--review-offline')
  console.log(JSON.stringify(compileReviewGuard(),null,2));
 else{console.error('F6U03F_HOSTED_EXECUTION_DISABLED');process.exitCode=1;}
}
