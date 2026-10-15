import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {isIP} from 'node:net';
import {pathToFileURL} from 'node:url';
import {validateReviewedBaseline} from './shoperation-disposable-fresh-replay.mjs';
import {NEUTRAL_ROWS} from './shoperation-f6-u03f-target-transaction-guard.mjs';

export const PROOF_SCOPE='HISTORICAL_0046_LOCAL_POSTGRES17_ONLY';
export const HISTORICAL_FINGERPRINT='e312b40ad91150ce937f4aa00db587f3';
export const FIXTURE_DB='f6_u03g_fixture';
export const HOSTED_EXECUTION_ENABLED=false;
const failure=s=>{throw new Error(s);};
export function historicalSource(root=process.cwd()){
 const v=validateReviewedBaseline(root);
 const paths=v.migrationFiles.filter(f=>Number(f.split('/').at(-1).slice(0,4))<=46);
 if(v.migrationCount!==59||paths.length!==47
  ||!paths[0].endsWith('/0001_shoperation_v1_schema.sql')
  ||!paths.at(-1).endsWith('/0046_alap_team_chat_plan_grant_reconcile.sql')
  ||paths.filter(x=>x.split('/').at(-1).startsWith('0026_')).length!==2)
  failure('F6U03G_HISTORICAL_FILE_SET_DRIFT');
 return Object.freeze({paths,reviewedCommit:v.reviewedCommit,sourceSetSha256:v.sourceSetSha256,
  historicalCount:paths.length,currentCount:v.migrationCount});
}
export function assertLocalFixture(env){
 if(!env||env.GITHUB_ACTIONS!=='true'||env.F6_U03G_EPHEMERAL!=='yes')
  failure('F6U03G_NOT_CI_EPHEMERAL');
 if(Object.keys(env).some(k=>/^PG[A-Z_]/i.test(k)
  ||/^(DATABASE_URL|SHOPERATION_FRESH_INSTALL_DB_URL|SUPABASE_DB_URL|SUPABASE_DATABASE_URL)$/i.test(k)))
  failure('F6U03G_EXTERNAL_CONNECTION_SELECTOR');
 const ip=env.F6_U03G_POSTGRES_CONTAINER_IP;
 const o=typeof ip==='string'?ip.split('.').map(Number):[];
 if(isIP(ip)!==4||!(o[0]===10||(o[0]===172&&o[1]>=16&&o[1]<=31)||(o[0]===192&&o[1]===168)))
  failure('F6U03G_UNBOUND_DOCKER_POSTGRES');
 return Object.freeze({host:'127.0.0.1',database:FIXTURE_DB,expectedServerIp:ip,user:'postgres'});
}
const shim=String.raw`CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
DO $localroles$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $localroles$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT null::uuid';
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT ''{}''::jsonb';
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT ''authenticated''::text';
CREATE TABLE storage.objects (id uuid PRIMARY KEY);
CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean NOT NULL,file_size_limit bigint);
INSERT INTO storage.buckets VALUES
 ('digital-products-private',false,2147483648),
 ('order-documents-private',false,26214400),
 ('product-documents-private',false,26214400),
 ('product-media',true,8388608);
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);`;
export function bootstrapSql(){return shim+'\n';}
export function applicationFingerprintSql(root=process.cwd()){
 const body=readFileSync(resolve(root,'scripts/shoperation-f6-u03f-target-transaction-guard.mjs'),'utf8');
 const match=/const CATALOG_SQL=("(?:\\.|[^"\\])*");/.exec(body);
 if(!match)failure('F6U03G_CANONICAL_FINGERPRINT_SOURCE_MISSING');
 const sql=JSON.parse(match[1]);
 if(!sql.includes("pg_get_functiondef(p.oid)")||!sql.includes("FROM pg_policy"))
  failure('F6U03G_CANONICAL_FINGERPRINT_INCOMPLETE');
 return sql+';';
}
export function positiveApplicationPreflightSql(root=process.cwd()){
 const statements=[
 'BEGIN;',
 "SET LOCAL lock_timeout = '3s';",
 "SET LOCAL statement_timeout = '3min';",
 'DO $f6app$ DECLARE rec record; n bigint; digest text; BEGIN',
 "IF (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind IN('r','p') AND NOT c.relispartition)<>175 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='private' AND c.relkind IN('r','p') AND NOT c.relispartition)<>2 THEN RAISE EXCEPTION 'F6U03G_TABLE_SET_MISMATCH'; END IF;",
 "FOR rec IN SELECT ns.nspname AS sch,c.relname AS tbl FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname IN('public','private') AND c.relkind IN('r','p') AND NOT c.relispartition ORDER BY ns.nspname,c.relname LOOP",
 "EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE NOWAIT',rec.sch,rec.tbl);",
 "EXECUTE format('SELECT count(*),md5(coalesce(string_agg(to_jsonb(x)::text,E''\\n'' ORDER BY to_jsonb(x)::text),'''')) FROM %I.%I x',rec.sch,rec.tbl) INTO n,digest;",
 "IF rec.sch='public' AND rec.tbl=ANY(ARRAY["+Object.keys(NEUTRAL_ROWS).map(x=>"'"+x+"'").join(',')+"]) THEN",
 "CASE rec.tbl",
 ...Object.entries(NEUTRAL_ROWS).map(([name,[count,hash]])=>
  "WHEN '"+name+"' THEN IF n<>"+count+" OR digest<>'"+hash+"' THEN RAISE EXCEPTION 'F6U03G_NEUTRAL_DRIFT:"+name+"'; END IF;"),
 "ELSE RAISE EXCEPTION 'F6U03G_UNKNOWN_CATALOG'; END CASE;",
 "ELSIF n<>0 THEN RAISE EXCEPTION 'F6U03G_CUSTOMER_ROW_PRESENT: %.%',rec.sch,rec.tbl; END IF;",
 'END LOOP;',
 "IF (SELECT count(*) FROM auth.users)<>0 THEN RAISE EXCEPTION 'F6U03G_AUTH_NOT_EMPTY'; END IF;",
 'END $f6app$;',
 applicationFingerprintSql(root),
 'ROLLBACK;',
 ];
 return statements.join('\n')+'\n';
}
function runPsql(env,{sql,file}={}){
 assertLocalFixture(env);
 const safeEnv={PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',PGPASSWORD:'f6-u03g-local-only',
  PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',PGAPPNAME:'shoperation-f6-u03g-ephemeral'};
 const args=['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','5432','-U','postgres','-d',FIXTURE_DB];
 if(file)args.push('-f',file);else args.push('-c',sql);
 const p=spawnSync('psql',args,{env:safeEnv,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
 if(p.error)failure('F6U03G_PSQL_PROCESS:'+p.error.message);
 if(p.status!==0)failure('F6U03G_PSQL_SQL_ERROR:'+(p.stderr??'').slice(-1400));
 return (p.stdout??'').trim();
}
export function runHistoricalProof(env=process.env,root=process.cwd()){
 const target=assertLocalFixture(env);
 const parts=runPsql(env,{sql:"SELECT current_database()||'|'||current_user||'|'||host(inet_server_addr())||'|'||current_setting('server_version_num');"}).split('|');
 if(parts[0]!==FIXTURE_DB||parts[1]!=='postgres'||parts[2]!==target.expectedServerIp||!/^17\d{4}$/.test(parts[3]))
  failure('F6U03G_WRONG_POSTGRES_SERVER_IDENTITY');
 const reviewed=historicalSource(root),dir=mkdtempSync(join(tmpdir(),'f6-u03g-'));
 try{
  runPsql(env,{sql:bootstrapSql()});
  const sqlfile=join(dir,'historical-0046.sql');
  writeFileSync(sqlfile,'BEGIN;\n'+reviewed.paths.map(x=>readFileSync(resolve(root,x),'utf8')).join('\n\n')
   +'\n'+readFileSync(resolve(root,'supabase/customer-baseline/auth-bootstrap.sql'),'utf8')+'\nCOMMIT;\n');
  runPsql(env,{file:sqlfile});
  const marker=runPsql(env,{sql:positiveApplicationPreflightSql(root)}).split('\n').at(-1);
  const [count,checksum]=(marker??'').split('|');
  if(count!=='4621'||checksum!==HISTORICAL_FINGERPRINT)
   failure('F6U03G_HISTORICAL_OBJECT_FINGERPRINT_DRIFT:'+count+':'+checksum);
  return Object.freeze({
   contract:'shoperation.f6-u03g.historical-replay.v1',
   decision:'PASS',scope:PROOF_SCOPE,pgVersion:parts[3],historicalMigrationsApplied:reviewed.historicalCount,
   historicalCatalogDefinitions:Number(count),historicalCatalogMd5:checksum,
   sourceSetSha256:reviewed.sourceSetSha256,
   currentBaselineMigrationsApplied:0,hostedSupabaseTouched:false,providerEventProof:false,
   fullTransactionGuardProved:false,realAlapProRlsProved:false,
  });
 }finally{rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.slice(2).join(' ')!=='--ci-ephemeral'){console.error('F6U03G_LOCAL_FIXTURE_ONLY');process.exitCode=1;}
 else try{console.log(JSON.stringify(runHistoricalProof(),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
