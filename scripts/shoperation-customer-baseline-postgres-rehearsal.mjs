#!/usr/bin/env node
// Opt-in isolated PostgreSQL 18 test only; NOT hosted Supabase/Auth/Storage proof.
// No TCP; no ambient PGHOST, PGSERVICE, credentials or external connection accepted.
// Usage: node scripts/shoperation-customer-baseline-postgres-rehearsal.mjs
import {spawnSync} from 'node:child_process';
import {accessSync,appendFileSync,chmodSync,constants,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(root,'supabase/customer-baseline/manifest.json'),'utf8'));
const names=readdirSync(resolve(root,manifest.baselineMigrationDirectory)).filter(n=>n.endsWith('.sql')).sort();
const argv=process.argv.slice(2);
if(argv.length>1||(argv.length===1&&!argv[0].startsWith('--pg-bin-dir=')))throw Error('Only a local PostgreSQL --pg-bin-dir absolute path is accepted');
const binDir=argv.length?argv[0].slice('--pg-bin-dir='.length):'/usr/lib/postgresql/18/bin';
if(!isAbsolute(binDir))throw Error('PostgreSQL binaries must be a LOCAL absolute path');
const bin=Object.fromEntries(['initdb','pg_ctl','postgres','psql'].map(n=>[n,join(binDir,n)]));
for(const [name,path] of Object.entries(bin))try{accessSync(path,constants.X_OK)}catch{throw Error('POSTGRES_BINARY_MISSING: '+name+' ('+path+')')}
if(!['snapshot-reviewed','ready'].includes(manifest.status)||!names.length)throw Error('CUSTOMER_BASELINE_NOT_REVIEWED');
const envBase={PATH:'/usr/bin:/bin',HOME:tmpdir(),LANG:'C.UTF-8',LC_ALL:'C.UTF-8'};
const database='shoperation_customer_rehearsal';
let dir=null,started=false,dbEnv=null;

function run(exe,args,label,pg=false,timeout=180000){
 const r=spawnSync(exe,args,{cwd:root,env:pg?dbEnv:envBase,encoding:'utf8',timeout,maxBuffer:20*1024*1024});
 if(r.error||r.status!==0)throw Error(label+': FAIL status='+r.status+' '+(r.error?.message??'')+'\n'+((r.stdout??'')+'\n'+(r.stderr??'')).trim().split('\n').slice(-16).join('\n'));
 return (r.stdout??'').trim();
}
function file(path,label){
 return run(bin.psql,['-X','-q','-v','ON_ERROR_STOP=1','-1','-d',database,'-f',resolve(root,path)],label,true);
}
function query(text,label){
 return run(bin.psql,['-X','-A','-t','-v','ON_ERROR_STOP=1','-d',database,'-c',text],label,true);
}
function deny(role,table){
 const r=spawnSync(bin.psql,['-X','-v','ON_ERROR_STOP=1','-d',database,'-c','SET ROLE '+role+';SELECT count(*) FROM public.'+table],{cwd:root,env:dbEnv,encoding:'utf8',timeout:15000});
 if(r.error||r.status===0||!/permission denied/i.test(r.stderr??''))throw Error('BROWSER_SELECT_NOT_DENIED: '+role+'.'+table+': '+(r.stderr??r.stdout??'').slice(-350));
}
function prove(){
 const q=[
 "SELECT",
 "NOT has_function_privilege('anon','public.record_inbound_office_email_v2(text,text,text,text,text)','EXECUTE'),",
 "NOT has_function_privilege('authenticated','public.record_inbound_office_email_v2(text,text,text,text,text)','EXECUTE'),",
 "NOT has_function_privilege('service_role','public.record_inbound_office_email_v2(text,text,text,text,text)','EXECUTE'),",
 "NOT has_function_privilege('anon','public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)','EXECUTE'),",
 "NOT has_function_privilege('authenticated','public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)','EXECUTE'),",
 "has_function_privilege('service_role','public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)','EXECUTE'),",
 "current_setting('listen_addresses')='',",
 "(SELECT count(*)=2 FROM pg_trigger WHERE tgrelid='public.communication_jobs'::regclass AND tgname LIKE 'communication_jobs_office_reply%' AND NOT tgisinternal AND tgenabled='O' AND (tgtype & 2)=2 AND (tgtype & 16)=16),",
 "(SELECT count(*)=1 FROM pg_trigger WHERE tgrelid='public.communication_jobs'::regclass AND tgname='communication_jobs_office_reply_mailbox_guard' AND (tgtype & 4)=4)"
 ].join('\n');
 const result=query(q,'ACTUAL_FUNCTION_RIGHTS_AND_TRIGGER_EVENTS').split('|');
 if(result.length!==9||result.some(x=>x!=='t'))throw Error('POSTGRES_SECURITY_CATALOG_PROOF_FAILED: '+result.join('|'));
 for(const table of ['office_attachments','office_drafts','office_mailboxes','office_thread_email_routes']){
   if(query("SELECT relrowsecurity FROM pg_class WHERE oid='public."+table+"'::regclass",'RLS_'+table)!=='t')throw Error('RLS_NOT_ENABLED: '+table);
   deny('anon',table);deny('authenticated',table);
 }
 const serviceResult=query('SET ROLE service_role; SELECT count(*) FROM public.office_drafts','SERVICE_ROLE_READ').split('\n').at(-1);
 if(serviceResult!=='0')throw Error('SERVICE_ROLE_READ_FAILED: '+serviceResult);
 console.log('LOCAL_POSTGRES_EFFECTIVE_GRANTS_RLS_TRIGGER_PASS');
}
function main(){
 run(process.execPath,[join(root,'scripts/validate-customer-baseline.mjs')],'CUSTOMER_BASELINE_STATIC_GUARD');
 dir=mkdtempSync(join(tmpdir(),'shoperation-pg-rehearsal-'));
 chmodSync(dir,0o700);
 const socket=join(dir,'socket'),data=join(dir,'data'),port=20000+(process.pid%30000);
 mkdirSync(socket,{mode:0o700});
 dbEnv={...envBase,PGHOST:socket,PGPORT:String(port),PGUSER:'postgres',PGDATABASE:database,PGSSLMODE:'disable'};
 run(bin.initdb,['-D',data,'-U','postgres','--auth-local=trust','--auth-host=reject','--locale=C.UTF-8','--no-instructions'],'ISOLATED_INITDB');
 appendFileSync(join(data,'postgresql.conf'),[
  '',"listen_addresses = ''",
  "unix_socket_directories = '"+socket.replaceAll("'","''")+"'",
  'unix_socket_permissions = 0700',
  'port = '+port,'logging_collector = off',''
 ].join('\n'));
 run(bin.pg_ctl,['-D',data,'-l',join(dir,'postgres.log'),'-w','start'],'ISOLATED_POSTGRES_START',false,60000);
 started=true;
 run(bin.psql,['-X','-v','ON_ERROR_STOP=1','-d','postgres','-c','CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN BYPASSRLS;CREATE ROLE supabase_admin NOLOGIN;'],'TEST_ONLY_SUPABASE_ROLES',true);
 run(bin.psql,['-X','-v','ON_ERROR_STOP=1','-d','postgres','-c','CREATE DATABASE '+database],'CREATE_DISPOSABLE_DATABASE',true);
 file('tests/fixtures/customer-baseline-postgres-shim.sql','TEST_ONLY_AUTH_STORAGE_FIXTURE');
 file('supabase/customer-baseline/target-preflight.sql','OFFICIAL_EMPTY_TARGET_PREFLIGHT');
 let n=0;
 for(const name of names){
  file(join(manifest.baselineMigrationDirectory,name),'REAL_POSTGRES_MIGRATION_'+name);
  n++;
  if(n%10===0)console.log('REAL_POSTGRES_MIGRATIONS_PROGRESS='+n+'/'+names.length);
 }
 console.log('REAL_POSTGRES_MIGRATIONS_PASS='+n+'/'+names.length);
 file(manifest.authBootstrapFile,'OFFICIAL_AUTH_BOOTSTRAP');
 file(manifest.seedFile,'OFFICIAL_CUSTOMER_SEED');
 file('supabase/customer-baseline/target-postflight.sql','OFFICIAL_POSTFLIGHT');
 console.log('OFFICIAL_PREFLIGHT_AUTH_SEED_POSTFLIGHT_PASS');
 prove();
 file('tests/fixtures/customer-baseline-office-reply-negative.sql','OFFICE_REPLY_ROLLBACK_NEGATIVE_DML');
 if(query("SELECT count(*) FROM public.webshop_instances WHERE id='a1111111-1111-4111-8111-111111111111'",'ROLLBACK_VERIFICATION')!=='0')throw Error('FIXTURE_ROLLBACK_FAILED');
 console.log('OFFICE_REPLY_REAL_INSERT_UPDATE_NEGATIVE_PASS');
 console.log('LOCAL_POSTGRES_TEST_FIXTURE_PASS count='+n);
 console.log('NOT_PROVEN: native Supabase Auth/Storage, provider emails, hosted ledger, Pro downgrade, customer E2E');
}
try{main()}catch(e){console.error(e instanceof Error?e.message:e);process.exitCode=1}finally{
 if(started&&dir){
  try{run(bin.pg_ctl,['-D',join(dir,'data'),'-m','immediate','-w','stop'],'LOCAL_POSTGRES_STOP',false,60000);started=false}
  catch(e){console.error('POSTGRES_STOP_FAILED '+(e?.message??e));process.exitCode=1}
 }
 if(!started&&dir&&existsSync(dir))rmSync(dir,{recursive:true,force:true});
 if(started)console.error('LOCAL_PG_CLEANUP_BLOCKED: socket-only private directory retained for inspection');
}
