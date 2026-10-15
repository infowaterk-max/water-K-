import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
export const SCOPE='LOCAL_HISTORICAL_0046_ONLY';
export const HOSTED_EXECUTION_ENABLED=false;
export const HISTORICAL_PROOF_SHA='03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4';
export const EXPECTED={fileCount:47,publicTables:175,privateTables:2,publicFunctions:344,publicPolicies:126,definitionCount:4621,definitionMd5:'e312b40ad91150ce937f4aa00db587f3'};
const fail=x=>{throw new Error(x);};
const sha=x=>createHash('sha256').update(x).digest('hex');
export function selectHistorical0046(root=process.cwd()){
 const dir=resolve(root,'supabase/customer-baseline/migrations');
 const names=readdirSync(dir).filter(n=>/^[0-9]{4}_[a-z0-9_]+\.sql$/.test(n)&&Number(n.slice(0,4))>=1&&Number(n.slice(0,4))<=46).sort();
 if(names.length!==47||names.filter(n=>n.startsWith('0026_')).length!==2||!names[0].startsWith('0001_')||!names.at(-1).startsWith('0046_'))fail('F6U03G_HISTORICAL_SET_DRIFT');
 const numbers=new Set(names.map(n=>Number(n.slice(0,4))));
 for(let i=1;i<=46;i++)if(!numbers.has(i))fail('F6U03G_GAP:'+i);
 const files=names.map(n=>{if(basename(n)!==n)fail('F6U03G_PATH_ESCAPE');const path='supabase/customer-baseline/migrations/'+n;const sql=readFileSync(resolve(root,path),'utf8');if(!sql.trim())fail('F6U03G_EMPTY_SQL');return {path,sql,hash:sha(sql)};});
 return {files,sourceSetSha256:sha(files.map(f=>f.path+'\t'+f.hash).join('\n')+'\n')};
}
export function buildReplay(root=process.cwd()){
 const s=selectHistorical0046(root);
 const chunks=[
 'BEGIN;',
 "SET LOCAL lock_timeout='5s';",
 "DO $local$ BEGIN IF current_database()<>'f6_u03g_fixture' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 OR to_regclass('auth.users') IS NULL THEN RAISE EXCEPTION 'F6U03G_WRONG_LOCAL_TARGET'; END IF; END $local$;",
 ...s.files.map(f=>'-- source '+f.path+'\n'+f.sql),
 readFileSync(resolve(root,'supabase/customer-baseline/auth-bootstrap.sql'),'utf8'),
 readFileSync(resolve(root,'supabase/customer-baseline/seed.sql'),'utf8'),
 'COMMIT;'
 ];
 const sql=chunks.join('\n\n')+'\n';
 return {sql,sha256:sha(sql),sourceSetSha256:s.sourceSetSha256,files:s.files.map(({path,hash})=>({path,hash})),
  count:s.files.length,executed:false,hostedResetEnabled:false};
}
const FIXTURE_BOOTSTRAP="DO $pre$ BEGIN IF current_database()<>'f6_u03g_fixture' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 THEN RAISE EXCEPTION 'F6U03G_WRONG_POSTGRES'; END IF; END $pre$;\nCREATE ROLE anon NOLOGIN;\nCREATE ROLE authenticated NOLOGIN;\nCREATE ROLE service_role NOLOGIN;\nCREATE ROLE supabase_admin NOLOGIN;\nCREATE SCHEMA auth AUTHORIZATION postgres;\nCREATE SCHEMA storage AUTHORIZATION postgres;\nCREATE SCHEMA extensions AUTHORIZATION postgres;\nCREATE SCHEMA supabase_migrations AUTHORIZATION postgres;\nCREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;\nCREATE TABLE auth.users (id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'::jsonb);\nCREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $a$ SELECT NULL::uuid $a$;\nCREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $a$ SELECT '{}'::jsonb $a$;\nCREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $a$ SELECT 'anon'::text $a$;\nCREATE TABLE auth.sessions(id uuid PRIMARY KEY);\nCREATE TABLE auth.identities(id uuid PRIMARY KEY);\nCREATE TABLE auth.mfa_factors(id uuid PRIMARY KEY);\nCREATE TYPE storage.buckettype AS ENUM ('STANDARD');\nCREATE TABLE storage.buckets(\n id text PRIMARY KEY,name text NOT NULL,owner uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),\n public boolean DEFAULT false,avif_autodetection boolean DEFAULT false,file_size_limit bigint,\n allowed_mime_types text[],owner_id text,type storage.buckettype NOT NULL DEFAULT 'STANDARD',\n versioning_status text NOT NULL DEFAULT 'DISABLED',lifecycle_configuration jsonb,lifecycle_configuration_generation uuid\n);\nCREATE TABLE storage.objects(\n id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,\n created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),last_accessed_at timestamptz DEFAULT now(),\n metadata jsonb,path_tokens text[],version text,owner_id text,user_metadata jsonb,archived_at timestamptz,\n is_delete_marker boolean NOT NULL DEFAULT false,is_versioned boolean NOT NULL DEFAULT false\n);\nCREATE TABLE storage.s3_multipart_uploads(id text PRIMARY KEY);\nCREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);\nGRANT USAGE ON SCHEMA auth,storage,extensions TO anon,authenticated,service_role;";

export function fixtureBootstrapSql(){return FIXTURE_BOOTSTRAP;}
export function classifyFixtureResult(input){
 if(!input||input.actual47Committed!==true||input.realPostgres17!==true||input.sourceCount!==47)fail('F6U03G_NO_REAL_REPLAY_PROOF');
 const exactCounts=input.publicTables===EXPECTED.publicTables&&input.privateTables===EXPECTED.privateTables&&input.publicFunctions===EXPECTED.publicFunctions&&input.publicPolicies===EXPECTED.publicPolicies;
 const exactFingerprint=input.definitionCount===EXPECTED.definitionCount&&input.definitionMd5===EXPECTED.definitionMd5;
 const guardPass=input.fullGuardVerdict==='PASS';
 if(guardPass&&(!exactCounts||!exactFingerprint))fail('F6U03G_FALSE_POSITIVE_GUARD');
 return Object.freeze({contract:'shoperation.f6-u03g.historical-fixture.v1',scope:SCOPE,
  replay:'47_HISTORICAL_SQL_COMMITTED',structuralParity:exactCounts?'PASS':'BLOCKED',
  schemaFingerprintParity:exactFingerprint?'PASS':'BLOCKED',exactGuardPositive:guardPass?'PASS':'BLOCKED',
  hostedDatabaseTouched:false,hosted59MigrationsApplied:0,alapProSignedInRlsProved:false});
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
  if(process.argv.length===4&&process.argv[2]==='--emit-bundle'){
   const out=resolve(process.argv[3]);
   if(!out.includes('/f6-u03g/'))fail('F6U03G_OUTPUT_PATH_NOT_SCOPED');
   mkdirSync(out,{recursive:true});
   const b=buildReplay();
   writeFileSync(join(out,'fixture-bootstrap.sql'),fixtureBootstrapSql());
   writeFileSync(join(out,'replay-0046.sql'),b.sql);
   writeFileSync(join(out,'manifest.json'),JSON.stringify({sourceCount:b.count,files:b.files,sourceSetSha256:b.sourceSetSha256,replaySqlSha256:b.sha256,scope:SCOPE,hostedDatabaseTouched:false},null,2));
   console.log(JSON.stringify({status:'GENERATED_ONLY',sourceCount:b.count,sha256:b.sha256}));
  }else if(process.argv[2]==='--source-review'&&process.argv.length===3){
   const x=buildReplay();
   console.log(JSON.stringify({decision:'SOURCE_REVIEW',sourceCount:x.count,sourceSetSha256:x.sourceSetSha256,sha256:x.sha256,hostedResetEnabled:false}));
  }else fail('F6U03G_NO_DATABASE_RUNNER');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
