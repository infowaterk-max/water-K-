import {it} from 'vitest';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {
  assertDisposableDbUrl,assertSafeLibpqEnvironment,prepareReviewedConnection,
  validateReviewedBaseline,runReview,EXECUTION_ENABLED,DISPOSABLE_FRESH_PROJECT_REF as ref,
} from '../scripts/shoperation-disposable-fresh-replay.mjs';

const direct='postgresql://postgres:secret@db.'+ref+'.supabase.co:5432/postgres';
const pooler='postgres://postgres.'+ref+':secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
function git(root:string,...args:string[]){return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}
function fixture(opts:{metaCommand?:boolean}={}){
  const root=mkdtempSync(join(tmpdir(),'shop-f6-u03-'));
  const migrations=join(root,'supabase/customer-baseline/migrations');
  mkdirSync(migrations,{recursive:true});
  const names=[
    '0001_shoperation_v1_schema.sql',
    ...Array.from({length:56},(_,i)=>String(i+2).padStart(4,'0')+'_step.sql'),
    '0026_extra.sql','0058_digital_office_plan_scoped_sql_guard_v2.sql',
  ];
  assert.equal(names.length,59);
  for(const name of names)writeFileSync(join(migrations,name),opts.metaCommand&&name==='0033_step.sql'?'\\connect hostile\n':'select 1;\n');
  const base=join(root,'supabase/customer-baseline');
  writeFileSync(join(base,'manifest.json'),JSON.stringify({
    status:'snapshot-reviewed',freshInstallProofRequired:true,
    baselineMigrationDirectory:'supabase/customer-baseline/migrations',legacyMigrationReplay:false,
  }));
  for(const companion of ['auth-bootstrap.sql','seed.sql','target-preflight.sql','target-postflight.sql'])
    writeFileSync(join(base,companion),'select 1;\n');
  git(root,'init','-q');git(root,'add','.');
  git(root,'-c','user.name=F6Test','-c','user.email=f6@example.invalid','commit','-qm','reviewed fixture');
  return {root,approvedCommit:git(root,'rev-parse','HEAD'),cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

it('accepts only exact direct and project-scoped pooler identities',()=>{
  assert.equal(assertDisposableDbUrl(direct).connectionKind,'direct');
  assert.equal(assertDisposableDbUrl(pooler).connectionKind,'pooler');
  assert.equal(assertDisposableDbUrl(direct+'?sslmode=verify-full').projectRef,ref);
});
it('blocks wrong project, database, service, user, port and missing password',()=>{
  for(const url of [
    direct.replace(ref,'ewdederyvnwmghlydbno'),
    direct.replace(ref,'rfuvzgumbardvbvqjxdq'),
    direct.replace('/postgres','/elsewhere'),
    direct.replace('postgres:secret','another:secret'),
    direct.replace('secret@','@'),
    direct.replace(':5432/',':5434/'),
    direct.replace('db.','spoofed.'),
    direct.replace('postgresql','https'),
    pooler.replace('postgres.'+ref,'postgres.rfuvzgumbardvbvqjxdq'),
  ])assert.throws(()=>assertDisposableDbUrl(url));
});
it('blocks disabled or downgraded TLS and arbitrary URI connection parameters',()=>{
  for(const query of ['sslmode=disable','sslmode=require','sslmode=verify-ca','hostaddr=192.0.2.1',
    'service=other','options=-c','sslmode=verify-full&sslmode=disable'])
    assert.throws(()=>assertDisposableDbUrl(direct+'?'+query),/FRESH_REARM_SSL_PARAMETERS_UNSAFE/);
});
it('pins the entire 59-file baseline and five companions to a reviewed Git ancestor',()=>{
  const f=fixture();
  try{
    const a=validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit});
    assert.equal(a.migrationCount,59);
    assert.equal(a.fileCount,64);
    assert.equal(a.decision,'REVIEW');
    assert.equal(a.databaseTouched,false);
    assert.match(a.sourceSetSha256,/^[0-9a-f]{64}$/);
    assert.equal(a.sourceSetSha256,validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}).sourceSetSha256);
  }finally{f.cleanup();}
});
it('rejects tampering inside an intermediate SQL while all filenames still match',()=>{
  const f=fixture();
  try{
    writeFileSync(join(f.root,'supabase/customer-baseline/migrations/0024_step.sql'),'select unsafe_operation();\n');
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/REVIEWED_SOURCE_BYTES_DRIFT/);
  }finally{f.cleanup();}
});
it('rejects changed corrected final 0058 SQL bytes',()=>{
  const f=fixture();
  try{
    writeFileSync(join(f.root,'supabase/customer-baseline/migrations/0058_digital_office_plan_scoped_sql_guard_v2.sql'),'select unsafe_operation();\n');
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/REVIEWED_SOURCE_BYTES_DRIFT/);
  }finally{f.cleanup();}
});
it('rejects tampering with manifest or Auth bootstrap',()=>{
  const f=fixture();
  try{
    writeFileSync(join(f.root,'supabase/customer-baseline/manifest.json'),'{}');
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/REVIEWED_SOURCE_BYTES_DRIFT/);
    writeFileSync(join(f.root,'supabase/customer-baseline/manifest.json'),
      JSON.stringify({status:'snapshot-reviewed',freshInstallProofRequired:true,
        baselineMigrationDirectory:'supabase/customer-baseline/migrations',legacyMigrationReplay:false}));
    writeFileSync(join(f.root,'supabase/customer-baseline/auth-bootstrap.sql'),'select unsafe_operation();\n');
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/REVIEWED_SOURCE_BYTES_DRIFT/);
  }finally{f.cleanup();}
});
it('rejects an added unauthorized migration',()=>{
  const f=fixture();
  try{
    writeFileSync(join(f.root,'supabase/customer-baseline/migrations/0059_unreviewed.sql'),'select 1;\n');
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/MIGRATION_FILE_SET_DRIFT/);
  }finally{f.cleanup();}
});
it('rejects unapproved psql connection-changing meta commands even when committed in fixture',()=>{
  const f=fixture({metaCommand:true});
  try{assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit}),/PSQL_META_COMMAND_UNREVIEWED/);}
  finally{f.cleanup();}
});
it('blocks a forged or unavailable approved Git commit',()=>{
  const f=fixture();
  try{
    assert.throws(()=>validateReviewedBaseline(f.root,{approvedCommit:'0'.repeat(40)}),/APPROVED_SOURCE_NOT_ANCESTOR/);
  }finally{f.cleanup();}
});
it('rejects all inherited libpq selectors instead of silently forwarding them',()=>{
  const f=fixture(),cert=join(f.root,'ca.pem');
  writeFileSync(cert,'-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n');
  try{
    for(const bad of [{PGHOSTADDR:'192.0.2.10'},{PGSERVICE:'wrong'},{PGOPTIONS:'-c search_path=evil'},
      {PGSSLMODE:'require'},{PGDATABASE:'postgresql://postgres:bad@evil.invalid/postgres'}]){
      assert.throws(()=>assertSafeLibpqEnvironment({PATH:'/usr/bin',SHOPERATION_FRESH_TLS_CA_CERT:cert,...bad}),
        /INHERITED_LIBPQ_ENV_REJECTED/);
    }
    const x=prepareReviewedConnection({dbUrl:direct,env:{PATH:'/usr/bin',SHOPERATION_FRESH_TLS_CA_CERT:cert,UNRELATED:'ignore'}});
    assert.equal(x.env.PGSSLMODE,'verify-full');
    assert.equal(x.env.PGDATABASE,direct);
    assert.equal(Object.hasOwn(x.env,'PGHOSTADDR'),false);
    assert.equal(Object.hasOwn(x.env,'UNRELATED'),false);
  }finally{f.cleanup();}
});
it('requires an explicit trusted CA certificate file before preparing the connection',()=>{
  assert.throws(()=>assertSafeLibpqEnvironment({}),/CA_CERT_REQUIRED/);
});
it('never includes an executable hosted SQL or psql invocation in this source-only unit',()=>{
  assert.equal(EXECUTION_ENABLED,false);
  const text=readFileSync('scripts/shoperation-disposable-fresh-replay.mjs','utf8');
  assert.doesNotMatch(text,/execFileSync\(['"]psql['"]/);
  assert.doesNotMatch(text,/DROP\s+SCHEMA\s+(?:public|private)/i);
  assert.match(text,/FRESH_REARM_EXECUTION_DISABLED_PENDING_HOSTED_PROOF/);
});
it('never silently upgrades source-only verification to Fresh Install or tenant-RLS runtime proof',()=>{
  const f=fixture();
  try{
    const res=validateReviewedBaseline(f.root,{approvedCommit:f.approvedCommit});
    assert.equal(res.decision,'REVIEW');
    assert.equal(res.scope,'SOURCE_ONLY_NOT_DB_PROOF');
    assert.equal(res.databaseTouched,false);
    assert.equal(EXECUTION_ENABLED,false);
    assert.throws(()=>runReview({root:f.root,dbUrl:direct,env:{}}));
  }finally{f.cleanup();}
});
