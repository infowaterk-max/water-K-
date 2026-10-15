import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {isIP} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TRANSACTION_GUARD_SQL,NEUTRAL_ROWS} from './shoperation-f6-u03f-target-transaction-guard.mjs';
import {EXPECTED_EVENTS,EXPECTED_SCHEMAS,READ_ONLY_SQL} from './shoperation-f6-u03d-managed-preflight.mjs';
import {SUPABASE_PROVIDER_FUNCTION_MD5} from './shoperation-f6-u03e-schema-restore.mjs';
import {compileAtomicReview} from './shoperation-fresh-disposable-reprovision.mjs';

// This is a ONE-WAY, fixture-only compiler. Never imported by the hosted source
// compiler. No Supabase credential, target URL, schema reset or cloud connection.
export const SCOPE='LOCAL_PG17_TRANSLATED_GUARD_POSITIVE_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const FIXTURE_DB='f6_u03g_fixture';
export const FIXTURE_PASSWORD='f6-u03g-disposable-only';
export const FIXTURE_SOURCE_SHA256=createHash('sha256').update(TRANSACTION_GUARD_SQL).digest('hex');
const fail=x=>{throw new Error(x);};
const md5text=sql=>createHash('md5').update(sql).digest('hex');
const sha256=sql=>createHash('sha256').update(sql).digest('hex');

export function assertFixtureEnvironment(env){
 if(!env||env.GITHUB_ACTIONS!=='true'||env.F6_U03G_EPHEMERAL!=='yes')
  fail('F6U03G_EPHEMERAL_MARKER_REQUIRED');
 if(Object.keys(env).some(k=>/^PG[A-Z_]/i.test(k)||/^(DATABASE_URL|SUPABASE_DB_URL|SUPABASE_DATABASE_URL|SHOPERATION_FRESH_INSTALL_DB_URL)$/i.test(k)))
  fail('F6U03G_EXTERNAL_DATABASE_SELECTOR');
 const ip=env.F6_U03G_DOCKER_IP,octets=typeof ip==='string'?ip.split('.').map(Number):[];
 if(isIP(ip)!==4||!(octets[0]===10||(octets[0]===172&&octets[1]>=16&&octets[1]<=31)||(octets[0]===192&&octets[1]===168)))
  fail('F6U03G_DOCKER_SERVICE_NOT_BOUND');
 return Object.freeze({db:FIXTURE_DB,host:'127.0.0.1',dockerIp:ip});
}
export const FIXTURE_CATALOGS=Object.freeze(Object.entries(NEUTRAL_ROWS).map(([name,[count]])=>Object.freeze({name,count})));
export function fixtureSetupSQL(){
 const sql=[
 "CREATE ROLE anon NOLOGIN;",
 "CREATE ROLE authenticated NOLOGIN;",
 "CREATE ROLE service_role NOLOGIN;",
 "CREATE ROLE supabase_admin NOLOGIN;",
 "ALTER SCHEMA public OWNER TO postgres;",
 "REVOKE ALL ON SCHEMA public FROM PUBLIC;",
 "GRANT USAGE,CREATE ON SCHEMA public TO postgres;",
 "GRANT USAGE ON SCHEMA public TO anon,authenticated;",
 "GRANT USAGE,CREATE ON SCHEMA public TO service_role,supabase_admin;",
 "CREATE SCHEMA private AUTHORIZATION postgres;",
 "GRANT USAGE,CREATE ON SCHEMA private TO postgres;",
 "GRANT USAGE ON SCHEMA private TO authenticated,service_role;",
 "CREATE SCHEMA auth;",
 "CREATE SCHEMA storage;",
 "CREATE SCHEMA extensions;",
 "GRANT USAGE,CREATE ON SCHEMA extensions TO supabase_admin;",
 "CREATE SCHEMA supabase_migrations;",
 "CREATE TABLE auth.users (id integer PRIMARY KEY);",
 "CREATE TABLE auth.identities (id integer PRIMARY KEY);",
 "CREATE TABLE auth.sessions (id integer PRIMARY KEY);",
 "CREATE TABLE auth.mfa_factors (id integer PRIMARY KEY);",
 "CREATE TABLE storage.objects (id integer PRIMARY KEY);",
 "CREATE TABLE storage.s3_multipart_uploads (id integer PRIMARY KEY);",
 "CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean NOT NULL,file_size_limit bigint);",
 "INSERT INTO storage.buckets VALUES"+
  "('digital-products-private',false,2147483648),"+
  "('order-documents-private',false,26214400),"+
  "('product-documents-private',false,26214400),"+
  "('product-media',true,8388608);",
 "CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);",
 "CREATE FUNCTION private.handle_new_user() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;",
 "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();",
 "CREATE TABLE private.f6u03g_internal_1(id integer PRIMARY KEY);",
 "CREATE TABLE private.f6u03g_internal_2(id integer PRIMARY KEY);",
 ];
 for(const {name,count} of FIXTURE_CATALOGS){
  if(!/^[a-z_]+$/.test(name)||!Number.isInteger(count)||count<1)fail('F6U03G_CATALOG_FIXTURE_INVALID');
  sql.push('CREATE TABLE public.'+name+'(code text PRIMARY KEY);');
  sql.push("INSERT INTO public."+name+"(code) SELECT 'fixture-'+g::text FROM generate_series(1,"+count+") AS g;");
 }
 const empties=175-FIXTURE_CATALOGS.length;
 if(empties!==168)fail('F6U03G_WRONG_APPLICATION_TABLE_COUNT');
 for(let n=1;n<=empties;n++)
  sql.push('CREATE TABLE public.f6u03g_empty_'+String(n).padStart(3,'0')+'(id integer PRIMARY KEY);');
 for(const [name,event,fn] of EXPECTED_EVENTS){
  if(!/^[a-z_]+$/.test(name)||!/^[a-z_]+\(\)$/.test(fn)||!['ddl_command_end','sql_drop'].includes(event))fail('F6U03G_UNSAFE_EVENT_DEFINITION');
  const fnName=fn.slice(0,-2);
  sql.push('CREATE FUNCTION extensions.'+fnName+'() RETURNS event_trigger LANGUAGE plpgsql AS $f$ BEGIN NULL; END $f$;');
  sql.push('ALTER FUNCTION extensions.'+fnName+'() OWNER TO supabase_admin;');
  sql.push('CREATE EVENT TRIGGER '+name+' ON '+event+' EXECUTE FUNCTION extensions.'+fnName+'();');
 }
 return sql.join('\n')+'\n';
}

function literalOnce(sql,oldText,newText,id){
 const at=sql.indexOf(oldText);
 if(at<0||sql.indexOf(oldText,at+oldText.length)>=0||oldText===newText)
  fail('F6U03G_AMBIGUOUS_FIXTURE_REPLACEMENT:'+id);
 return sql.slice(0,at)+newText+sql.slice(at+oldText.length);
}
export function compilePositiveFixtureGuard(observed){
 if(!observed||observed.db!==FIXTURE_DB||observed.publicTables!==175||observed.privateTables!==2
  ||!observed.catalogs||!observed.eventHashes||!Number.isInteger(observed.definitionCount)
  ||observed.definitionCount<100||!/^[a-f0-9]{32}$/.test(observed.definitionHash))
  fail('F6U03G_FIXTURE_OBSERVATION_INVALID');
 let sql=TRANSACTION_GUARD_SQL;
 const substitutions=[];
 const replace=(id,from,to)=>{
  sql=literalOnce(sql,from,to,id);
  substitutions.push({id,expectedBefore:from,fixtureReplacement:to});
 };
 for(const [name,[count,oldHash]] of Object.entries(NEUTRAL_ROWS)){
  const o=observed.catalogs[name];
  if(!o||o.count!==count||!/^[a-f0-9]{32}$/.test(o.md5))fail('F6U03G_CATALOG_OBSERVATION_DRIFT:'+name);
  replace('neutral:'+name,"expected_hash:='"+oldHash+"'","expected_hash:='"+o.md5+"'");
 }
 if(Object.keys(observed.catalogs).length!==FIXTURE_CATALOGS.length)fail('F6U03G_CATALOG_SET_CHANGED');
 for(const [name,oldHash] of Object.entries(SUPABASE_PROVIDER_FUNCTION_MD5)){
  const actual=observed.eventHashes[name];
  if(!/^[a-f0-9]{32}$/.test(actual??''))fail('F6U03G_EVENT_OBSERVATION_DRIFT:'+name);
  replace('event:'+name,"AND md5(pg_get_functiondef(p.oid))='"+oldHash+"'","AND md5(pg_get_functiondef(p.oid))='"+actual+"'");
 }
 if(Object.keys(observed.eventHashes).length!==EXPECTED_EVENTS.length)fail('F6U03G_EVENT_SET_CHANGED');
 replace('objectCount',"catalog_items<>4621","catalog_items<>"+observed.definitionCount);
 replace('objectFingerprint',"canonical_hash<>'e312b40ad91150ce937f4aa00db587f3'","canonical_hash<>'"+observed.definitionHash+"'");
 if(substitutions.length!==15||sql.includes('@@')||!sql.includes('ACCESS EXCLUSIVE MODE NOWAIT')
  ||!sql.includes("F6U03F_APPLICATION_USER_DATA_PRESENT")||!sql.includes("F6U03F_AUTH_TRIGGER_DRIFT")
  ||/\bDROP SCHEMA\b/i.test(sql))
  fail('F6U03G_GUARD_CONTROL_FLOW_CHANGED');
 return Object.freeze({scope:SCOPE,sourceGuardSha256:FIXTURE_SOURCE_SHA256,
  fixtureGuardSha256:sha256(sql),substitutions:Object.freeze(substitutions),sql});
}

function psql(sql,env,{shouldFail=false,expectedError}={}){
 assertFixtureEnvironment(env);
 const childEnv={PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',
  PGPASSWORD:FIXTURE_PASSWORD,PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',
  PGAPPNAME:'shoperation-f6-u03g-ephemeral'};
 const args=['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','5432',
  '-U','postgres','-d',FIXTURE_DB,'-c',sql];
 const v=spawnSync('psql',args,{env:childEnv,encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024});
 if(v.error)fail('F6U03G_PSQL_PROCESS:'+v.error.message);
 if((!shouldFail&&v.status!==0)||(shouldFail&&v.status===0))
  fail('F6U03G_PSQL_WRONG_RESULT:'+(v.stderr??'').slice(0,950));
 if(expectedError&&!String(v.stderr??'').includes(expectedError))
  fail('F6U03G_WRONG_REJECTION:'+expectedError+':'+String(v.stderr).slice(0,850));
 return {status:v.status,stdout:(v.stdout??'').trim(),stderr:(v.stderr??'').trim()};
}
function observations(env){
 const snapshot=JSON.parse(psql(READ_ONLY_SQL,env).stdout);
 if(snapshot.database!=='f6_u03g_fixture'||snapshot.dbRole!=='postgres'||snapshot.serverMajor!==17
  ||snapshot.publicTables!==175||snapshot.privateTables!==2
  ||snapshot.externalDependencies?.length!==1||
  snapshot.externalDependencies[0].dependent!=='trigger on_auth_user_created on table auth.users'
  ||snapshot.externalDependencies[0].referenced!=='function private.handle_new_user()'
  ||snapshot.eventTriggers?.length!==6||snapshot.schemaGrants?.length!==2
  ||snapshot.storageBuckets?.length!==4)fail('F6U03G_FIXTURE_MANAGED_CENSUS_INVALID');
 for(const [schema,expected] of Object.entries(EXPECTED_SCHEMAS)){
  const s=snapshot.schemaGrants.find(x=>x.name===schema);
  if(!s||s.owner!==expected.owner||JSON.stringify([...s.acl].sort())!==JSON.stringify([...expected.acl].sort()))
   fail('F6U03G_FIXTURE_ACL_NOT_CANONICAL:'+schema);
 }
 const catalogs={};
 for(const {name,count} of FIXTURE_CATALOGS){
  const txt=psql("SELECT count(*)||'|'||md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM public."+name+" x;",env).stdout;
  const [n,md5]=txt.split('|');
  if(Number(n)!==count)fail('F6U03G_NEUTRAL_ROW_DRIFT:'+name);
  catalogs[name]={count,md5};
 }
 const eventHashes={};
 for(const e of snapshot.eventTriggers)
  eventHashes[e.name]=psql("SELECT md5(pg_get_functiondef(e.evtfoid)) FROM pg_event_trigger e WHERE e.evtname='"+e.name+"';",env).stdout;
 // Use exactly the object-definition SQL embedded in the original F6-U03f guard.
 const begin='EXECUTE $f6_catalog$';
 const end='$f6_catalog$ INTO catalog_items,canonical_hash;';
 const a=TRANSACTION_GUARD_SQL.indexOf(begin),b=TRANSACTION_GUARD_SQL.indexOf(end,a+begin.length);
 if(a<0||b<=a)fail('F6U03G_ORIGINAL_CATALOG_QUERY_NOT_FOUND');
 const query=TRANSACTION_GUARD_SQL.slice(a+begin.length,b);
 const [definitionCount,definitionHash]=psql(query,env).stdout.split('|');
 return {db:FIXTURE_DB,publicTables:175,privateTables:2,catalogs,eventHashes,
  definitionCount:Number(definitionCount),definitionHash};
}
function runGuard(guard,env,mutation='',expectError=null){
 const sql='BEGIN;\nSET LOCAL lock_timeout=\'4s\';\nSET LOCAL statement_timeout=\'70s\';\n'+
  (mutation?mutation+'\n':'')+guard.sql+'\nROLLBACK;';
 return psql(sql,env,{shouldFail:!!expectError,expectedError:expectError});
}
export function runPositiveGuardFixture(env=process.env){
 const target=assertFixtureEnvironment(env);
 const identity=psql("SELECT current_database()||'|'||current_user||'|'||host(inet_server_addr())||'|'||current_setting('server_version_num');",env).stdout.split('|');
 if(identity[0]!==FIXTURE_DB||identity[1]!=='postgres'||identity[2]!==target.dockerIp||!/^17[0-9]{4}$/.test(identity[3]))
  fail('F6U03G_UNEXPECTED_DB_PEER');
 const initialTables=psql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p');",env).stdout;
 if(initialTables!=='0')fail('F6U03G_NONVIRGIN_FIXTURE');
 psql(fixtureSetupSQL(),env);
 const observed=observations(env),guard=compilePositiveFixtureGuard(observed);
 const candidate=compileAtomicReview(process.cwd());
 const start=candidate.sql.indexOf('DO $f6_guard$');
 const abort=candidate.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
 const drop=candidate.sql.indexOf('DROP SCHEMA private CASCADE;');
 if(candidate.executionEnabled!==false||candidate.migrationCount!==59||start<0||abort<start||drop<abort
  ||!candidate.sql.includes(TRANSACTION_GUARD_SQL))fail('F6U03G_HOSTED_ABORT_AUTHORITY_CHANGED');
 runGuard(guard,env); // Real imported DO guard: all 177 locks, 113 neutral rows, six event checks, fingerprint.
 const negatives=[
  {name:'user-data',mutation:'INSERT INTO public.f6u03g_empty_001 VALUES (77);',
   rejection:'F6U03F_APPLICATION_USER_DATA_PRESENT'},
  {name:'same-count-neutral-drift',mutation:"UPDATE public.addon_capability_grants SET code='altered-fixture-01' WHERE code='fixture-1';",
   rejection:'F6U03F_NEUTRAL_CATALOG_HASH_DRIFT'},
  {name:'schema-grant-drift',mutation:'REVOKE USAGE ON SCHEMA public FROM anon;',
   rejection:'F6U03F_SCHEMA_ACL_DRIFT:public'},
  {name:'auth-user-presence',mutation:'INSERT INTO auth.users VALUES (37);',
   rejection:'F6U03F_MANAGED_SNAPSHOT_DRIFT'},
  {name:'storage-object-presence',mutation:'INSERT INTO storage.objects VALUES (67);',
   rejection:'F6U03F_MANAGED_SNAPSHOT_DRIFT'},
  {name:'provider-event-disabled',mutation:'ALTER EVENT TRIGGER pgrst_ddl_watch DISABLE;',
   rejection:'F6U03F_MANAGED_EVENT_DRIFT:pgrst_ddl_watch'},
 ];
 const evidence=[];
 for(const scenario of negatives){
  runGuard(guard,env,scenario.mutation,scenario.rejection);
  runGuard(guard,env); // An unchanged, newly connected transaction proves rollback.
  evidence.push({name:scenario.name,outcome:'EXPECTED_EXCEPTION_AND_ORIGINAL_GUARD_RESTORED'});
 }
 return Object.freeze({contract:'shoperation.f6-u03g.positive-guard-fixture.v1',
  scope:SCOPE,decision:'PASS',postgresVersion:identity[3],
  sourceGuardSha256:FIXTURE_SOURCE_SHA256,fixtureGuardSha256:guard.fixtureGuardSha256,
  sourceSetSha256:candidate.sourceSetSha256,originalBaselineMigrationCount:candidate.migrationCount,
  fixtureAppTables:177,fixtureNeutralRows:113,fixtureObjectDefinitions:observed.definitionCount,
  fixtureSubstitutions:guard.substitutions,positiveTransactions:1,
  rejectedDriftScenarios:evidence.length,evidence,executedAgainstSupabase:false,
  hostedProjectTLSProven:false,actual59MigrationsApplied:0,original4621DefinitionGuardProved:false,
  providerSupabaseBehaviorProved:false,signedInAlapProRlsProved:false,
  hostedResetExecutionEnabled:HOSTED_EXECUTION_ENABLED});
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.slice(2).join(' ')!=='--ci-ephemeral'){
  console.error('F6U03G_NO_HOSTED_DATABASE_EXECUTION');process.exitCode=1;
 }else try{console.log(JSON.stringify(runPositiveGuardFixture(),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
