import {spawnSync} from 'node:child_process';
import {isIP} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const SCOPE='LOCAL_POSTGRES17_ACL_DDL_EVENT_FIXTURE_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const FIXTURE_DB='f6_u03e_fixture';
export const FAULTS=Object.freeze(['AFTER_DROP','AFTER_REGRANT','AFTER_AUTH','BEFORE_COMMIT']);
export const SUPABASE_PROVIDER_FUNCTION_MD5=Object.freeze({
 issue_graphql_placeholder:'8da9dff6b2ae47498209d341acaeb60b',
 issue_pg_cron_access:'53a44336da0ac1dd62d89dbd988e6d1d',
 issue_pg_graphql_access:'0c16c9ca00598b032d420b133f97d122',
 issue_pg_net_access:'1d06ef4fb47bb0ab6e6f8818a62013bb',
 pgrst_ddl_watch:'afaad7193dcf8f81e728d2bedb85e43e',
 pgrst_drop_watch:'4357772baf5cfcd5c6d7049585b3a537',
});
const block=id=>{throw new Error(id);};
export function verifyEphemeral(env){
 if(env?.GITHUB_ACTIONS!=='true'||env?.F6_U03E_EPHEMERAL!=='yes')block('F6U03E_NOT_EPHEMERAL');
 if(Object.keys(env).some(k=>/^PG[A-Z_]/i.test(k)||/^(DATABASE_URL|SHOPERATION_FRESH_INSTALL_DB_URL|SUPABASE_DB_URL|SUPABASE_DATABASE_URL)$/i.test(k)))block('F6U03E_EXTERNAL_DATABASE_SELECTOR');
 const ip=env.F6_U03E_CONTAINER_IP,o=typeof ip==='string'?ip.split('.').map(Number):[];
 if(isIP(ip)!==4||!(o[0]===10||(o[0]===172&&o[1]>=16&&o[1]<=31)||(o[0]===192&&o[1]===168)))block('F6U03E_UNBOUND_POSTGRES_CONTAINER');
 return Object.freeze({db:FIXTURE_DB,host:'127.0.0.1',ip});
}
export function regrantSQL(){
 return [
 'REVOKE ALL ON SCHEMA f6u03e_public FROM PUBLIC;',
 'REVOKE ALL ON SCHEMA f6u03e_private FROM PUBLIC;',
 'GRANT USAGE ON SCHEMA f6u03e_public TO f6u03e_anon, f6u03e_authenticated;',
 'GRANT USAGE, CREATE ON SCHEMA f6u03e_public TO f6u03e_service_role, f6u03e_supabase_admin;',
 'GRANT USAGE ON SCHEMA f6u03e_private TO f6u03e_authenticated, f6u03e_service_role;',
 ].join('\n')+'\n';
}
const INIT_SQL="DROP EVENT TRIGGER IF EXISTS f6u03e_ddl_watcher;\nDROP EVENT TRIGGER IF EXISTS f6u03e_drop_watcher;\nDROP SCHEMA IF EXISTS f6u03e_auth CASCADE;\nDROP SCHEMA IF EXISTS f6u03e_public CASCADE;\nDROP SCHEMA IF EXISTS f6u03e_private CASCADE;\nDROP SCHEMA IF EXISTS f6u03e_audit CASCADE;\nDO $roles$ BEGIN\n IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='f6u03e_anon') THEN CREATE ROLE f6u03e_anon NOLOGIN; END IF;\n IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='f6u03e_authenticated') THEN CREATE ROLE f6u03e_authenticated NOLOGIN; END IF;\n IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='f6u03e_service_role') THEN CREATE ROLE f6u03e_service_role NOLOGIN; END IF;\n IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='f6u03e_supabase_admin') THEN CREATE ROLE f6u03e_supabase_admin NOLOGIN; END IF;\nEND $roles$;\nCREATE SCHEMA f6u03e_audit;\nCREATE TABLE f6u03e_audit.events(id bigint GENERATED ALWAYS AS IDENTITY,tag text);\nCREATE FUNCTION f6u03e_audit.ddl() RETURNS event_trigger LANGUAGE plpgsql AS $fn$ BEGIN\n IF tg_tag IN('CREATE SCHEMA','CREATE TABLE','CREATE FUNCTION','CREATE TRIGGER') THEN\n INSERT INTO f6u03e_audit.events(tag) VALUES('ddl:'||tg_tag); END IF;\nEND $fn$;\nCREATE FUNCTION f6u03e_audit.dropped() RETURNS event_trigger LANGUAGE plpgsql AS $fn$ BEGIN\n INSERT INTO f6u03e_audit.events(tag) VALUES('drop:'||tg_tag);\nEND $fn$;\nCREATE EVENT TRIGGER f6u03e_ddl_watcher ON ddl_command_end EXECUTE FUNCTION f6u03e_audit.ddl();\nCREATE EVENT TRIGGER f6u03e_drop_watcher ON sql_drop EXECUTE FUNCTION f6u03e_audit.dropped();\nCREATE SCHEMA f6u03e_auth;\nCREATE SCHEMA f6u03e_public AUTHORIZATION postgres;\nCREATE SCHEMA f6u03e_private AUTHORIZATION postgres;\nCREATE TABLE f6u03e_auth.users(id integer PRIMARY KEY);\nCREATE TABLE f6u03e_public.orders(id integer PRIMARY KEY,label text);\nINSERT INTO f6u03e_public.orders VALUES (7,'old-data');\nCREATE FUNCTION f6u03e_private.on_user() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;\nCREATE TRIGGER f6u03e_external_auth_trigger AFTER INSERT ON f6u03e_auth.users FOR EACH ROW EXECUTE FUNCTION f6u03e_private.on_user();";
const NEW_DATA="CREATE TABLE f6u03e_public.orders(id integer PRIMARY KEY,label text);\nINSERT INTO f6u03e_public.orders VALUES (7,'new-data');\nCREATE FUNCTION f6u03e_private.on_user() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;\nCREATE TRIGGER f6u03e_external_auth_trigger AFTER INSERT ON f6u03e_auth.users FOR EACH ROW EXECUTE FUNCTION f6u03e_private.on_user();";

export function setupSQL(){return INIT_SQL+'\n'+regrantSQL();}
const faultSQL=x=>"DO $err$ BEGIN RAISE EXCEPTION 'F6U03E_FAULT_"+x+"'; END $err$;";
export function replaySQL({fault=null,includeGrants=true}={}){
 if(fault!==null&&!FAULTS.includes(fault))block('F6U03E_UNKNOWN_FAULT');
 const stage=(key,statement)=>statement+(fault===key?'\n'+faultSQL(key):'');
 return [
 'BEGIN;',
 "SET LOCAL lock_timeout='3s';","SET LOCAL statement_timeout='20s';",
 'SELECT pg_advisory_xact_lock(118603,5);',
 stage('AFTER_DROP','DROP SCHEMA f6u03e_private CASCADE;\nDROP SCHEMA f6u03e_public CASCADE;'),
 'CREATE SCHEMA f6u03e_public AUTHORIZATION postgres;',
 'CREATE SCHEMA f6u03e_private AUTHORIZATION postgres;',
 stage('AFTER_REGRANT',includeGrants?regrantSQL():'-- Intentionally missing named-role grants'),
 stage('AFTER_AUTH',NEW_DATA),
 "DO $check$ BEGIN IF NOT has_schema_privilege('f6u03e_anon','f6u03e_public','USAGE') OR has_schema_privilege('f6u03e_anon','f6u03e_public','CREATE') OR NOT has_schema_privilege('f6u03e_authenticated','f6u03e_public','USAGE') OR has_schema_privilege('f6u03e_authenticated','f6u03e_public','CREATE') OR NOT has_schema_privilege('f6u03e_authenticated','f6u03e_private','USAGE') OR has_schema_privilege('f6u03e_authenticated','f6u03e_private','CREATE') OR NOT has_schema_privilege('f6u03e_service_role','f6u03e_public','CREATE') OR NOT has_schema_privilege('f6u03e_supabase_admin','f6u03e_public','CREATE') OR has_schema_privilege('f6u03e_service_role','f6u03e_private','CREATE') THEN RAISE EXCEPTION 'F6U03E_ACL_NOT_RESTORED'; END IF; END $check$;",
 ...(fault==='BEFORE_COMMIT'?[faultSQL('BEFORE_COMMIT')]:[]),
 'COMMIT;',
 ].join('\n')+'\n';
}
export function statusSQL(){
 const permissions=[
 ['f6u03e_anon','f6u03e_public','USAGE'],['f6u03e_anon','f6u03e_public','CREATE'],
 ['f6u03e_authenticated','f6u03e_public','USAGE'],['f6u03e_authenticated','f6u03e_public','CREATE'],
 ['f6u03e_service_role','f6u03e_public','USAGE'],['f6u03e_service_role','f6u03e_public','CREATE'],
 ['f6u03e_supabase_admin','f6u03e_public','USAGE'],['f6u03e_supabase_admin','f6u03e_public','CREATE'],
 ['f6u03e_authenticated','f6u03e_private','USAGE'],['f6u03e_authenticated','f6u03e_private','CREATE'],
 ['f6u03e_service_role','f6u03e_private','USAGE'],['f6u03e_service_role','f6u03e_private','CREATE'],
 ];
 return "SELECT (SELECT label FROM f6u03e_public.orders WHERE id=7)||'|'||(SELECT count(*) FROM pg_trigger WHERE tgname='f6u03e_external_auth_trigger')::text||'|'||(SELECT count(*) FROM f6u03e_audit.events)::text"+
 permissions.map(([role,schema,priv])=>"||has_schema_privilege('"+role+"','"+schema+"','"+priv+"')::int::text").join('')+";";
}
function psql(sql,env,{fails=false}={}){
 verifyEphemeral(env);
 const settings={PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',PGPASSWORD:'f6-u03e-ephemeral-only',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5'};
 const p=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','5432','-U','postgres','-d',FIXTURE_DB,'-c',sql],
 {env:settings,encoding:'utf8',timeout:28000,maxBuffer:1024*1024});
 if(p.error)block('F6U03E_PSQL_PROCESS:'+p.error.message);
 if(fails&&p.status===0)block('F6U03E_EXPECTED_FAILURE_BUT_PASSED');
 if(!fails&&p.status!==0)block('F6U03E_PSQL_ERROR:'+(p.stderr??'').slice(0,500));
 return {out:(p.stdout??'').trim(),err:(p.stderr??'').trim()};
}
const EXPECTED='101011111010';
function assertStatus(raw,label,eventCount=null){
 const a=raw.split('|');
 if(a[0]!==label||a[1]!=='1'||a[3]!==EXPECTED||!Number.isInteger(Number(a[2])))block('F6U03E_INVALID_ACL_OR_AUTH:'+raw);
 if(eventCount!==null&&Number(a[2])!==eventCount)block('F6U03E_EVENT_AUDIT_NOT_ROLLED_BACK');
 return Number(a[2]);
}
export function runFixture(env=process.env){
 const e=verifyEphemeral(env);
 const connection=psql("SELECT current_database()||'|'||current_user||'|'||host(inet_server_addr())||'|'||current_setting('server_version_num');",env).out.split('|');
 if(connection[0]!==FIXTURE_DB||connection[1]!=='postgres'||connection[2]!==e.ip||!/^17\d{4}$/.test(connection[3]))block('F6U03E_WRONG_DATABASE_SERVER');
 const evidence=[];
 for(const point of [...FAULTS,'MISSING_GRANT']){
  psql(setupSQL(),env);
  const baseline=assertStatus(psql(statusSQL(),env).out,'old-data');
  const result=psql(point==='MISSING_GRANT'?replaySQL({includeGrants:false}):replaySQL({fault:point}),env,{fails:true});
  const msg=point==='MISSING_GRANT'?'F6U03E_ACL_NOT_RESTORED':'F6U03E_FAULT_'+point;
  if(!result.err.includes(msg))block('F6U03E_WRONG_FAILURE:'+point+':'+result.err.slice(0,120));
  assertStatus(psql(statusSQL(),env).out,'old-data',baseline);
  evidence.push({point,outcome:'ROLLBACK_RESTORED_ACL_EXTERNAL_TRIGGER_AND_EVENT_AUDIT'});
 }
 psql(setupSQL(),env);
 const old=assertStatus(psql(statusSQL(),env).out,'old-data');
 psql(replaySQL(),env);
 const current=assertStatus(psql(statusSQL(),env).out,'new-data');
 if(current<=old)block('F6U03E_MISSING_COMMITTED_DDL_EVENT');
 return Object.freeze({
  contract:'shoperation.f6-u03e.postgres17-acl-event.v1',scope:SCOPE,decision:'PASS',
  serverVersion:connection[3],failedTransactions:evidence.length,successfulCommits:1,
  ddlAuditCommitted:current>old,evidence,supabaseTouched:false,
  hostedFreshInstallProved:false,providerEventTriggersExecuted:false,
  actualBaselineMigrationsApplied:0,alapProRlsProved:false,
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.slice(2).join(' ')!=='--ci-ephemeral'){console.error('F6U03E_NO_HOSTED_DATABASE_EXECUTION');process.exitCode=1;}
 else try{console.log(JSON.stringify(runFixture(),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
