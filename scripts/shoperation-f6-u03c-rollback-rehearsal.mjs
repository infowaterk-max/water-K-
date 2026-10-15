import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {isIP} from 'node:net';
import {pathToFileURL} from 'node:url';

// Explicitly an ephemeral LOCAL Postgres DDL rollback rehearsal. No Supabase access.
export const FIXTURE_DATABASE='f6_u03c_fixture';
export const FIXTURE_HOST='127.0.0.1';
export const FIXTURE_PORT='5432';
export const FIXTURE_PASSWORD='f6-u03c-fixture-only';
export const PROOF_SCOPE='LOCAL_POSTGRES16_TRANSACTION_ONLY';
export const FAILURE_POINTS=Object.freeze([
  'BEFORE_DROP','AFTER_DROP','MIGRATION_0001','MIGRATION_0058',
  'AUTH_BOOTSTRAP','NEUTRAL_SEED','POSTFLIGHT',
]);

const fail=id=>{throw new Error(id);};

export function assertIsolatedHarnessEnvironment(env){
  if(!env||env.GITHUB_ACTIONS!=='true'||env.F6_U03C_EPHEMERAL_FIXTURE!=='yes')
    fail('F6U03C_NON_EPHEMERAL_ENVIRONMENT');
  if(Object.keys(env).some(k=>/^PG[A-Z_]/i.test(k)))
    fail('F6U03C_INHERITED_PG_CONNECTION_SELECTOR');
  if(Object.keys(env).some(k=>/^(DATABASE_URL|SHOPERATION_FRESH_INSTALL_DB_URL|SUPABASE_DB_URL|SUPABASE_DATABASE_URL)$/i.test(k)))
    fail('F6U03C_HOSTED_CONNECTION_PRESENT');
  const expectedIp=env.F6_U03C_EXPECTED_SERVICE_IP;
  const octets=typeof expectedIp==='string'?expectedIp.split('.').map(Number):[];
  const isPrivate=octets[0]===10||(octets[0]===172&&octets[1]>=16&&octets[1]<=31)||(octets[0]===192&&octets[1]===168);
  if(typeof expectedIp!=='string'||isIP(expectedIp)!==4||!isPrivate)
    fail('F6U03C_SERVICE_IP_NOT_BOUND');
  return Object.freeze({host:FIXTURE_HOST,port:FIXTURE_PORT,database:FIXTURE_DATABASE,user:'postgres',expectedServiceIp:expectedIp});
}

export function fixtureSql(){
  return [
    'DROP SCHEMA IF EXISTS f6_u03c_auth CASCADE;',
    'DROP SCHEMA IF EXISTS f6_u03c_private CASCADE;',
    'DROP SCHEMA IF EXISTS f6_u03c_app CASCADE;',
    'CREATE SCHEMA f6_u03c_auth;',
    'CREATE SCHEMA f6_u03c_private;',
    'CREATE SCHEMA f6_u03c_app;',
    'CREATE TABLE f6_u03c_auth.users (id integer PRIMARY KEY);',
    'CREATE TABLE f6_u03c_app.orders (id integer PRIMARY KEY, label text NOT NULL);',
    "INSERT INTO f6_u03c_app.orders VALUES (7,'before-transaction');",
    'CREATE FUNCTION f6_u03c_private.on_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;',
    'CREATE TRIGGER f6_u03c_external_auth_trigger AFTER INSERT ON f6_u03c_auth.users FOR EACH ROW EXECUTE FUNCTION f6_u03c_private.on_user();',
  ].join('\n')+'\n';
}
const fault=(point)=>"DO $f6_injection$ BEGIN RAISE EXCEPTION 'F6U03C_INJECTED_"+point+"'; END $f6_injection$;";
export function replaySql(injectAt=null){
  if(injectAt!==null&&!FAILURE_POINTS.includes(injectAt))fail('F6U03C_UNKNOWN_INJECTION_POINT');
  const statements=['BEGIN;',"SET LOCAL lock_timeout = '3s';","SET LOCAL statement_timeout = '20s';",
    "SELECT pg_advisory_xact_lock(118603,3);"];
  const stage=(stageName,sql)=>{
    if(injectAt===stageName)statements.push(fault(stageName));
    if(sql)statements.push(sql);
  };
  stage('BEFORE_DROP','DROP SCHEMA f6_u03c_private CASCADE;\nDROP SCHEMA f6_u03c_app CASCADE;');
  stage('AFTER_DROP','CREATE SCHEMA f6_u03c_private;\nCREATE SCHEMA f6_u03c_app;');
  stage('MIGRATION_0001','CREATE TABLE f6_u03c_app.orders (id integer PRIMARY KEY, label text NOT NULL);');
  stage('MIGRATION_0058',"INSERT INTO f6_u03c_app.orders VALUES (7,'after-transaction');");
  stage('AUTH_BOOTSTRAP','CREATE FUNCTION f6_u03c_private.on_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;\nCREATE TRIGGER f6_u03c_external_auth_trigger AFTER INSERT ON f6_u03c_auth.users FOR EACH ROW EXECUTE FUNCTION f6_u03c_private.on_user();');
  stage('NEUTRAL_SEED',"CREATE TABLE f6_u03c_app.neutral_catalog (code text PRIMARY KEY);\nINSERT INTO f6_u03c_app.neutral_catalog VALUES ('known-test-catalog');");
  stage('POSTFLIGHT',"DO $postflight$ BEGIN IF (SELECT count(*) FROM f6_u03c_app.orders WHERE label='after-transaction')<>1 THEN RAISE EXCEPTION 'F6U03C_POSTFLIGHT_BAD'; END IF; END $postflight$;");
  statements.push('COMMIT;');
  return statements.join('\n')+'\n';
}

export function checkSql(){
  return [
    "SELECT (SELECT label FROM f6_u03c_app.orders WHERE id=7)",
    "|| '|' || (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='f6_u03c_auth' AND c.relname='users' AND t.tgname='f6_u03c_external_auth_trigger' AND NOT t.tgisinternal)::text",
    "|| '|' || (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='f6_u03c_private' AND p.proname='on_user')::text",
    "|| '|' || (SELECT count(*) FROM f6_u03c_auth.users)::text AS snapshot;",
  ].join(' ')+'\n';
}

function connectionEnvironment(env){
  const i=assertIsolatedHarnessEnvironment(env);
  return {target:i,env:{
    PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',
    PGPASSWORD:FIXTURE_PASSWORD,PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',PGAPPNAME:'shoperation-f6-u03c-ephemeral',
  }};
}
function psql(sql,env,{expectFailure=false}={}){
  const {env:isolated}=connectionEnvironment(env);
  const args=['-X','-Atq','-v','ON_ERROR_STOP=1','-h',FIXTURE_HOST,'-p',FIXTURE_PORT,'-U','postgres','-d',FIXTURE_DATABASE,'-c',sql];
  const proc=spawnSync('psql',args,{env:isolated,encoding:'utf8',timeout:25000,maxBuffer:2*1024*1024});
  if(proc.error)fail('F6U03C_PSQL_PROCESS_ERROR:'+proc.error.message);
  if(expectFailure&&proc.status===0)fail('F6U03C_INJECTION_UNEXPECTED_SUCCESS');
  if(!expectFailure&&proc.status!==0)fail('F6U03C_PSQL_FAILED:'+(proc.stderr||'').slice(0,850));
  return {status:proc.status,stdout:(proc.stdout||'').trim(),stderr:(proc.stderr||'').trim()};
}

function assertPostgresServer(env){
  const query="SELECT current_database() || '|' || current_user || '|' || host(inet_server_addr()) || '|' || current_setting('server_version_num');";
  const x=psql(query,env);
  const [database,user,host,version]=x.stdout.split('|');
  if(database!==FIXTURE_DATABASE||user!=='postgres'||host!==env.F6_U03C_EXPECTED_SERVICE_IP||!/^16[0-9]{4}$/.test(version))
    fail('F6U03C_CONNECTED_TO_UNEXPECTED_SERVER');
  return {database,user,host,postgresVersion:version};
}
function assertFixtureState(env,expected){
  const actual=psql(checkSql(),env).stdout;
  const want=expected==='old'?'before-transaction|1|1|0':'after-transaction|1|1|0';
  if(actual!==want)fail('F6U03C_FIXTURE_STATE_DRIFT:'+expected+':'+actual);
}
export function runIsolatedRollbackProof(env=process.env){
  const target=assertIsolatedHarnessEnvironment(env);
  const server=assertPostgresServer(env);
  const evidence=[];
  for(const point of FAILURE_POINTS){
    psql(fixtureSql(),env);
    assertFixtureState(env,'old');
    const failure=psql(replaySql(point),env,{expectFailure:true});
    if(!failure.stderr.includes('F6U03C_INJECTED_'+point))
      fail('F6U03C_DIFFERENT_SQL_FAILURE:'+point+':'+failure.stderr.slice(0,250));
    assertFixtureState(env,'old');
    evidence.push({point,outcome:'ROLLBACK_PRESERVED_OLD_ROW_AND_EXTERNAL_TRIGGER'});
  }
  psql(fixtureSql(),env);
  const positive=psql(replaySql(),env);
  assert.equal(positive.status,0);
  assertFixtureState(env,'new');
  evidence.push({point:'COMMIT',outcome:'NEW_SCHEMA_ROW_AND_EXTERNAL_TRIGGER_PROVED'});
  return Object.freeze({
    contract:'shoperation.f6-u03c.postgresql-rollback.v1',
    scope:PROOF_SCOPE,decision:'PASS',database:target.database,serverVersion:server.postgresVersion,
    failedTransactionTrials:FAILURE_POINTS.length,successfulReplays:1,evidence,
    supabaseTouched:false,actualCustomerBaselineMigrationCount:0,
    hostedFreshInstallProof:false,alapProRlsProof:false,
  });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.slice(2).join(' ')!=='--ci-ephemeral'){
    console.error('F6U03C_FIXTURE_ONLY_NO_GENERAL_SQL_MODE');process.exitCode=1;
  }else{
    try{console.log(JSON.stringify(runIsolatedRollbackProof(),null,2));}
    catch(e){console.error(e.message);process.exitCode=1;}
  }
}
