import {spawn,spawnSync} from 'node:child_process';
import {isIP} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {NEUTRAL_ROWS,TRANSACTION_GUARD_SQL} from './shoperation-f6-u03f-target-transaction-guard.mjs';

// Real PG17, synthetic 177 relations; NOT the historical 4621 Supabase objects.
export const SCOPE='LOCAL_SYNTHETIC_177_TABLES_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const DB='f6_u03g_fixture';
export const FIXTURE_CATALOGS=Object.freeze(Object.entries(NEUTRAL_ROWS).map(([name,[count]])=>({name,count})));
const fail=x=>{throw new Error(x)};
if(FIXTURE_CATALOGS.length!==7||FIXTURE_CATALOGS.reduce((s,x)=>s+x.count,0)!==113
 ||!TRANSACTION_GUARD_SQL.includes('ACCESS EXCLUSIVE MODE NOWAIT'))
 fail('F6U03G_PARENT_GUARD_SOURCE_DRIFT');
export function validateEnvironment(env){
 if(env?.GITHUB_ACTIONS!=='true'||env?.F6_U03G_EPHEMERAL!=='yes')fail('F6U03G_NOT_EPHEMERAL');
 if(Object.keys(env).some(k=>/^PG[A-Z_]/i.test(k)||/^(DATABASE_URL|SHOPERATION_FRESH_INSTALL_DB_URL|SUPABASE_DB_URL|SUPABASE_DATABASE_URL)$/i.test(k)))
  fail('F6U03G_DATABASE_SELECTOR_FORBIDDEN');
 const ip=env.F6_U03G_CONTAINER_IP,p=typeof ip==='string'?ip.split('.').map(Number):[];
 if(isIP(ip)!==4||!(p[0]===10||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)))
  fail('F6U03G_UNVERIFIED_DOCKER_IP');
 return Object.freeze({database:DB,host:'127.0.0.1',serviceIp:ip});
}
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
export function setupSQL(){
 const a=[
  'DROP SCHEMA IF EXISTS f6u03g_private CASCADE;',
  'DROP SCHEMA IF EXISTS f6u03g_public CASCADE;',
  'DROP SCHEMA IF EXISTS f6u03g_meta CASCADE;',
  'CREATE SCHEMA f6u03g_private;',
  'CREATE SCHEMA f6u03g_public;',
  'CREATE SCHEMA f6u03g_meta;',
  'CREATE TABLE f6u03g_meta.expected(name text PRIMARY KEY,expected_count integer,expected_md5 text);',
 ];
 for(const {name,count} of FIXTURE_CATALOGS){
  a.push('CREATE TABLE f6u03g_public.'+name+'(id integer PRIMARY KEY,code text NOT NULL);');
  a.push('INSERT INTO f6u03g_public.'+name+'(id,code) SELECT g,'+quote(name)+"||'-'||g::text FROM generate_series(1,"+count+') g;');
  a.push('INSERT INTO f6u03g_meta.expected SELECT '+quote(name)+",count(*),md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM f6u03g_public."+name+' x;');
 }
 for(let i=1;i<=168;i++)a.push('CREATE TABLE f6u03g_public.sample_'+String(i).padStart(3,'0')+'(id integer PRIMARY KEY,label text);');
 for(const name of ['internal_one','internal_two'])a.push('CREATE TABLE f6u03g_private.'+name+'(id integer PRIMARY KEY,label text);');
 return a.join('\n')+'\n';
}
export function guardSQL(){
 return [
  'BEGIN;',"SET LOCAL lock_timeout='2s';","SET LOCAL statement_timeout='25s';",
  'DO $guard$',
  'DECLARE rec record; found_count bigint; found_hash text; allowed integer:=0; baseline record;',
  'BEGIN',
  "IF current_database()<>'f6_u03g_fixture' OR current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17 THEN RAISE EXCEPTION 'F6U03G_WRONG_DB_ROLE_VERSION'; END IF;",
  "IF NOT pg_try_advisory_xact_lock(118603,7) THEN RAISE EXCEPTION 'F6U03G_ADVISORY_LOCK_BUSY'; END IF;",
  "IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6u03g_public' AND c.relkind IN('r','p') AND NOT c.relispartition)<>175 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6u03g_private' AND c.relkind IN('r','p') AND NOT c.relispartition)<>2 THEN RAISE EXCEPTION 'F6U03G_RELATION_SET_CHANGED'; END IF;",
  "FOR rec IN SELECT n.nspname sch,c.relname tbl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('f6u03g_public','f6u03g_private') AND c.relkind IN('r','p') AND NOT c.relispartition ORDER BY n.nspname,c.relname LOOP",
  "EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE NOWAIT',rec.sch,rec.tbl);",
  'END LOOP;',
  "IF (SELECT count(*) FROM f6u03g_meta.expected)<>7 THEN RAISE EXCEPTION 'F6U03G_CATALOG_SET_CHANGED'; END IF;",
  "FOR rec IN SELECT n.nspname sch,c.relname tbl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('f6u03g_public','f6u03g_private') AND c.relkind IN('r','p') AND NOT c.relispartition ORDER BY n.nspname,c.relname LOOP",
  "EXECUTE format('SELECT count(*),md5(coalesce(string_agg(to_jsonb(x)::text,E''\\n'' ORDER BY to_jsonb(x)::text),'''')) FROM %I.%I x',rec.sch,rec.tbl) INTO found_count,found_hash;",
  "IF rec.sch='f6u03g_public' AND EXISTS(SELECT 1 FROM f6u03g_meta.expected e WHERE e.name=rec.tbl) THEN",
  'SELECT expected_count,expected_md5 INTO baseline FROM f6u03g_meta.expected WHERE name=rec.tbl;',
  "IF found_count<>baseline.expected_count OR found_hash<>baseline.expected_md5 THEN RAISE EXCEPTION 'F6U03G_NEUTRAL_HASH_DRIFT: %',rec.tbl; END IF;",
  'allowed:=allowed+found_count;',
  "ELSIF found_count<>0 THEN RAISE EXCEPTION 'F6U03G_USER_DATA_PRESENT: %.%',rec.sch,rec.tbl; END IF;",
  'END LOOP;',
  "IF allowed<>113 THEN RAISE EXCEPTION 'F6U03G_TOTAL_DRIFT'; END IF;",
  'END $guard$;',
  'COMMIT;',
 ].join('\n')+'\n';
}
function clientEnv(env){
 validateEnvironment(env);
 return {PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',PGPASSWORD:'f6-u03g-ephemeral-only',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5'};
}
const args=q=>['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','5432','-U','postgres','-d',DB,'-c',q];
function execSQL(q,env,{mustFail=false}={}){
 const x=spawnSync('psql',args(q),{env:clientEnv(env),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 if(x.error)fail('F6U03G_PSQL_PROCESS:'+x.error.message);
 if(!mustFail&&x.status!==0)fail('F6U03G_SQL_UNEXPECTED_FAILURE:'+(x.stderr||'').slice(0,620));
 if(mustFail&&x.status===0)fail('F6U03G_SQL_UNEXPECTED_SUCCESS');
 return {out:(x.stdout||'').trim(),err:(x.stderr||'').trim()};
}
function expectBlocked(env,message){
 const x=execSQL(guardSQL(),env,{mustFail:true});
 if(!x.err.includes(message))fail('F6U03G_WRONG_REJECTION:'+x.err.slice(0,450));
}
function reset(env){execSQL(setupSQL(),env);}
function assertLocalServer(env){
 const r=execSQL("SELECT current_database()||'|'||current_user||'|'||host(inet_server_addr())||'|'||current_setting('server_version_num');",env).out.split('|');
 if(r[0]!==DB||r[1]!=='postgres'||r[2]!==env.F6_U03G_CONTAINER_IP||!/^17[0-9]{4}$/.test(r[3]))
  fail('F6U03G_NOT_BOUND_TO_DOCKER_PG17');
 return r[3];
}
function concurrentNowait(env){
 const other=spawn('psql',args('BEGIN; LOCK TABLE f6u03g_public.sample_001 IN ACCESS SHARE MODE; SELECT pg_sleep(9); COMMIT;'),{env:clientEnv(env),stdio:'ignore'});
 try{
  let held=false;
  for(let i=0;i<80;i++){
   const v=execSQL("SELECT count(*) FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6u03g_public' AND c.relname='sample_001' AND l.mode='AccessShareLock' AND l.granted AND l.pid<>pg_backend_pid();",env).out;
   if(Number(v)>0){held=true;break;}
  }
  if(!held)fail('F6U03G_LOCK_HOLDER_NOT_READY');
  const start=Date.now();expectBlocked(env,'could not obtain lock on relation');
  if(Date.now()-start>5000)fail('F6U03G_LOCK_WAIT_EXCEEDED_NOWAIT');
 }finally{
  // Terminate ONLY the PostgreSQL backend holding our namespaced fixture lock.
  // Killing the client alone may leave pg_sleep() active until the server notices.
  execSQL("SELECT pg_terminate_backend(l.pid) FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6u03g_public' AND c.relname='sample_001' AND l.mode='AccessShareLock' AND l.granted AND l.pid<>pg_backend_pid();",env);
  other.kill('SIGTERM');
  // The client may terminate before PostgreSQL releases its backend lock.
  // Never claim a post-fault positive guard until a separate session proves release.
  let released=false;
  for(let i=0;i<180;i++){
   const cnt=execSQL("SELECT count(*) FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6u03g_public' AND c.relname='sample_001' AND l.mode='AccessShareLock' AND l.granted AND l.pid<>pg_backend_pid();",env).out;
   if(cnt==='0'){released=true;break;}
  }
  if(!released)fail('F6U03G_CONCURRENT_LOCK_NOT_RELEASED');
 }
}
export function runFixture(env=process.env){
 validateEnvironment(env);const version=assertLocalServer(env);const evidence=[];
 reset(env);
 const first=execSQL("SELECT (SELECT count(*) FROM f6u03g_meta.expected)||'|'||(SELECT sum(expected_count) FROM f6u03g_meta.expected);",env).out;
 if(first!=='7|113')fail('F6U03G_BAD_SYNTHETIC_CATALOG');
 execSQL(guardSQL(),env);evidence.push({case:'CLEAN_177_TABLES',status:'PASS'});
 execSQL("UPDATE f6u03g_public.entitlement_capabilities SET code='modified' WHERE id=1;",env);
 expectBlocked(env,'F6U03G_NEUTRAL_HASH_DRIFT');
 if(execSQL("SELECT code FROM f6u03g_public.entitlement_capabilities WHERE id=1;",env).out!=='modified')fail('F6U03G_TAMPER_STATE_ROLLED_AWAY');
 evidence.push({case:'SAME_COUNT_CONTENT_TAMPER',status:'REJECTED'});
 reset(env);execSQL("INSERT INTO f6u03g_private.internal_two VALUES(9,'customer');",env);
 expectBlocked(env,'F6U03G_USER_DATA_PRESENT');
 if(execSQL("SELECT count(*) FROM f6u03g_private.internal_two;",env).out!=='1')fail('F6U03G_ROW_NOT_PRESERVED');
 evidence.push({case:'UNAUTHORIZED_APP_ROW',status:'REJECTED'});
 reset(env);execSQL('DROP TABLE f6u03g_private.internal_one;',env);
 expectBlocked(env,'F6U03G_RELATION_SET_CHANGED');evidence.push({case:'MISSING_RELATION',status:'REJECTED'});
 reset(env);execSQL('CREATE TABLE f6u03g_public.extra_table(id integer);',env);
 expectBlocked(env,'F6U03G_RELATION_SET_CHANGED');evidence.push({case:'EXTRA_RELATION',status:'REJECTED'});
 reset(env);concurrentNowait(env);evidence.push({case:'REAL_CONCURRENT_NOWAIT',status:'REJECTED'});
 execSQL(guardSQL(),env);evidence.push({case:'POST_FAILURE_CLEAN',status:'PASS'});
 return Object.freeze({contract:'shoperation.f6-u03g.synthetic-177-guard.v1',scope:SCOPE,decision:'PASS',
  postgresVersion:version,applicationRelations:177,neutralCatalogs:7,syntheticNeutralRows:113,
  positiveTransactions:2,negativeTrials:5,evidence,
  hostedSupabaseTouched:false,hostedResetAuthorized:HOSTED_EXECUTION_ENABLED,
  historical4621ObjectsProven:false,original59MigrationsApplied:0,alapProRlsProven:false});
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.slice(2).join(' ')!=='--ephemeral-ci'){console.error('F6U03G_NO_HOSTED_EXECUTION');process.exitCode=1;}
 else try{console.log(JSON.stringify(runFixture(),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
