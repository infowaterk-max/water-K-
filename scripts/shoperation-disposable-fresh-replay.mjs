import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync,realpathSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

// Core #1186 F6-U03a: source/connection REVIEW only; this module cannot execute SQL.
// Destructive reprovision requires an independently proven later development transaction.
export const EXECUTION_ENABLED=false;
export const DISPOSABLE_FRESH_PROJECT_REF='istjjkdcvsvilrycqecd';
export const REVIEWED_SOURCE_COMMIT='6a29778b6ea971f42fe25eb26181b192a97ab23d';
const MIGRATIONS='supabase/customer-baseline/migrations';
const COMPANIONS=[
  'supabase/customer-baseline/manifest.json',
  'supabase/customer-baseline/auth-bootstrap.sql',
  'supabase/customer-baseline/seed.sql',
  'supabase/customer-baseline/target-preflight.sql',
  'supabase/customer-baseline/target-postflight.sql',
];
const block=code=>{throw new Error(code);};
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:20000}).trim();
const gitBlob=body=>createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');

export function assertDisposableDbUrl(value){
  const projectRef=DISPOSABLE_FRESH_PROJECT_REF;
  if(typeof value!=='string'||!value||/[\x00-\x1f\x7f]/.test(value))
    block('FRESH_REARM_DB_URL_INVALID');
  let url;
  try{url=new URL(value);}catch{block('FRESH_REARM_DB_URL_INVALID');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.hash||!url.password)
    block('FRESH_REARM_DB_CONNECTION_INVALID');
  let db,user;
  try{db=decodeURIComponent(url.pathname);user=decodeURIComponent(url.username);}
  catch{block('FRESH_REARM_DB_ENCODING_INVALID');}
  if(db!=='/postgres')block('FRESH_REARM_DATABASE_UNEXPECTED');
  const keys=[...url.searchParams.keys()];
  if(keys.some(key=>key!=='sslmode')||url.searchParams.getAll('sslmode').length>1
    ||(url.searchParams.has('sslmode')&&url.searchParams.get('sslmode')!=='verify-full'))
    block('FRESH_REARM_SSL_PARAMETERS_UNSAFE');
  const host=url.hostname.toLowerCase();
  const direct=host==='db.'+projectRef+'.supabase.co'&&user==='postgres';
  const pooler=host==='aws-0-eu-central-1.pooler.supabase.com'&&user==='postgres.'+projectRef;
  if(!direct&&!pooler)block('FRESH_REARM_TARGET_IDENTITY_MISMATCH');
  if(url.port&&(direct?url.port!=='5432':!['5432','6543'].includes(url.port)))
    block('FRESH_REARM_PORT_UNEXPECTED');
  return Object.freeze({projectRef,connectionKind:direct?'direct':'pooler',host,database:'postgres'});
}

export function assertSafeLibpqEnvironment(env,{caKey='SHOPERATION_FRESH_TLS_CA_CERT'}={}){
  if(!env||typeof env!=='object')block('FRESH_REARM_ENV_REQUIRED');
  const inherited=Object.keys(env).filter(key=>/^PG[A-Z_]/.test(key));
  if(inherited.length)block('FRESH_REARM_INHERITED_LIBPQ_ENV_REJECTED:'+inherited.sort().join(','));
  const ca=env[caKey];
  if(typeof ca!=='string'||!ca.startsWith('/'))block('FRESH_REARM_CA_CERT_REQUIRED');
  try{
    if(!statSync(ca).isFile()||!readFileSync(ca,'utf8').includes('-----BEGIN CERTIFICATE-----'))
      block('FRESH_REARM_CA_CERT_INVALID');
  }catch(e){if(String(e.message).startsWith('FRESH_REARM_'))throw e;block('FRESH_REARM_CA_CERT_INVALID');}
  return Object.freeze({PATH:env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',
    PGSSLMODE:'verify-full',PGSSLROOTCERT:ca,PGCONNECT_TIMEOUT:'10',
    PGAPPNAME:'shoperation-fresh-install-f6-u03'});
}

export function prepareReviewedConnection({dbUrl,env}){
  const target=assertDisposableDbUrl(dbUrl);
  const safeEnv=assertSafeLibpqEnvironment(env);
  // Preparation only: no libpq/psql execution and no database connection is made.
  return Object.freeze({target,env:Object.freeze({...safeEnv,PGDATABASE:dbUrl})});
}

export function validateReviewedBaseline(root=process.cwd(),{approvedCommit=REVIEWED_SOURCE_COMMIT}={}){
  if(!/^[0-9a-f]{40}$/.test(approvedCommit))block('FRESH_REARM_APPROVED_SHA_INVALID');
  try{
    if(git(root,['rev-parse','--is-inside-work-tree'])!=='true')block('FRESH_REARM_REPO_REQUIRED');
    git(root,['cat-file','-e',approvedCommit+'^{commit}']);
    git(root,['merge-base','--is-ancestor',approvedCommit,'HEAD']);
  }catch{block('FRESH_REARM_APPROVED_SOURCE_NOT_ANCESTOR');}
  const expected=git(root,['ls-tree','-r','--name-only',approvedCommit,'--',MIGRATIONS])
    .split('\n').filter(Boolean).sort();
  const actual=readdirSync(resolve(root,MIGRATIONS)).map(name=>MIGRATIONS+'/'+name).sort();
  if(expected.length!==59||actual.length!==59||JSON.stringify(expected)!==JSON.stringify(actual))
    block('FRESH_REARM_MIGRATION_FILE_SET_DRIFT');
  if(!expected[0].endsWith('/0001_shoperation_v1_schema.sql')
    ||!expected.at(-1).endsWith('/0058_digital_office_plan_scoped_sql_guard_v2.sql'))
    block('FRESH_REARM_MIGRATION_SEQUENCE_UNEXPECTED');
  const included=[...expected,...COMPANIONS];
  const repoRoot=realpathSync(root);
  const digest=createHash('sha256');
  for(const path of included){
    if(!/^[a-zA-Z0-9_./-]+$/.test(path))block('FRESH_REARM_SOURCE_PATH_INVALID');
    const candidate=resolve(root,path);
    if(!candidate.startsWith(resolve(root)+sep))block('FRESH_REARM_SOURCE_PATH_ESCAPE');
    let data;
    try{
      if(!statSync(candidate).isFile()||!realpathSync(candidate).startsWith(repoRoot+sep))
        block('FRESH_REARM_SOURCE_FILE_UNSAFE');
      data=readFileSync(candidate);
    }catch(e){if(String(e.message).startsWith('FRESH_REARM_'))throw e;block('FRESH_REARM_SOURCE_MISSING:'+path);}
    const tree=git(root,['ls-tree',approvedCommit,'--',path]);
    const match=/^100644 blob ([a-f0-9]{40}\b)/.exec(tree);
    if(!match||gitBlob(data)!==match[1])block('FRESH_REARM_REVIEWED_SOURCE_BYTES_DRIFT:'+path);
    if(path.endsWith('.sql')&&/^\s*\\(?:connect|c|!|copy|include|i|ir|gexec|gset|o|out)\b/im.test(data.toString('utf8')))
      block('FRESH_REARM_PSQL_META_COMMAND_UNREVIEWED:'+path);
    digest.update(path+'\0');digest.update(data);digest.update('\0');
  }
  const manifest=JSON.parse(readFileSync(join(root,COMPANIONS[0]),'utf8'));
  if(manifest.status!=='snapshot-reviewed'||manifest.freshInstallProofRequired!==true
    ||manifest.baselineMigrationDirectory!==MIGRATIONS||manifest.legacyMigrationReplay!==false)
    block('FRESH_REARM_MANIFEST_INVALID');
  return Object.freeze({decision:'REVIEW',scope:'SOURCE_ONLY_NOT_DB_PROOF',
    reviewedCommit:approvedCommit,fileCount:included.length,migrationCount:expected.length,
    migrationFiles:expected,sourceSetSha256:digest.digest('hex'),databaseTouched:false});
}

export function runReview({root=process.cwd(),dbUrl,env=process.env}={}){
  const baseline=validateReviewedBaseline(root);
  const connection=prepareReviewedConnection({dbUrl,env});
  return Object.freeze({decision:'REVIEW',databaseTouched:false,executionEnabled:EXECUTION_ENABLED,
    baseline,connection:{target:connection.target,sslmode:'verify-full'}});
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  // No --execute mode exists. In particular the module never invokes psql.
  if(process.argv.slice(2).join(' ')!=='--review'){
    process.stderr.write('FRESH_REARM_EXECUTION_DISABLED_PENDING_HOSTED_PROOF\n');
    process.exitCode=1;
  }else{
    try{console.log(JSON.stringify(runReview({dbUrl:process.env.SHOPERATION_FRESH_INSTALL_DB_URL}),null,2));}
    catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
  }
}
