import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  validateReviewedBaseline,assertDisposableDbUrl,assertSafeLibpqEnvironment,
  DISPOSABLE_FRESH_PROJECT_REF,
} from './shoperation-disposable-fresh-replay.mjs';

// F6-U03b: OFFLINE transaction review compiler. Nothing in this module
// can execute SQL, and emitted SQL intentionally aborts before any DROP.
export const HOSTED_EXECUTION_ENABLED=false;
export const HISTORICAL_SCHEMA_MD5='e312b40ad91150ce937f4aa00db587f3';
const fail=code=>{throw new Error(code);};
export const NEUTRAL_CATALOGS=Object.freeze({
  addon_capability_grants:[4,'603e4da6e9b73f18f08de9b648c8d140'],
  addon_entitlement_catalog:[4,'ab9929cc98f52e790627f7f29e5e6cea'],
  addon_plan_compatibility:[7,'52e8cd3fc13054647ffbcc11f57005a0'],
  entitlement_capabilities:[38,'b0837c65a65b17613030b647e74764f5'],
  entitlement_source_precedence:[5,'c60294237cba6a8100c39eae1ed7c29b'],
  plan_capability_grants:[53,'c0d071de44955a6eb0225bd86159f37d'],
  subscription_plan_catalog:[2,'cb1a33c97779af7bb0e009b1ba650410'],
});
const BUCKETS=[
  ['digital-products-private',false,2147483648],
  ['order-documents-private',false,26214400],
  ['product-documents-private',false,26214400],
  ['product-media',true,8388608],
];

export function validateOccupiedTargetSnapshot(snapshot){
  if(!snapshot||typeof snapshot!=='object')fail('FRESH_REPROVISION_SNAPSHOT_REQUIRED');
  const expected={
    publicTables:175,privateTables:2,publicFunctions:344,privateFunctions:36,
    publicPolicies:126,authUsers:0,authIdentities:0,authSessions:0,authMfaFactors:0,
    storageObjects:0,storageUploads:0,migrations:0,
    externalForeignKeys:0,unexpectedExternalTriggers:0,appExtensions:0,
    neutralRowTotal:113,
  };
  for(const [key,value] of Object.entries(expected))
    if(snapshot[key]!==value)fail('FRESH_REPROVISION_SNAPSHOT_DRIFT:'+key);
  if(snapshot.catalogMd5!==HISTORICAL_SCHEMA_MD5)
    fail('FRESH_REPROVISION_SCHEMA_FINGERPRINT_DRIFT');
  if(!snapshot.neutralCatalogs||Object.keys(snapshot.neutralCatalogs).length!==7)
    fail('FRESH_REPROVISION_CATALOG_SET_DRIFT');
  for(const [name,[count,sha]] of Object.entries(NEUTRAL_CATALOGS)){
    const v=snapshot.neutralCatalogs[name];
    if(!v||v.count!==count||v.md5!==sha)
      fail('FRESH_REPROVISION_NEUTRAL_CATALOG_DRIFT:'+name);
  }
  if(!Array.isArray(snapshot.buckets)||snapshot.buckets.length!==4)
    fail('FRESH_REPROVISION_STORAGE_BUCKET_DRIFT');
  for(const [id,publicFlag,limit] of BUCKETS){
    const b=snapshot.buckets.find(x=>x&&x.id===id);
    if(!b||b.public!==publicFlag||b.file_size_limit!==limit)
      fail('FRESH_REPROVISION_STORAGE_BUCKET_DRIFT:'+id);
  }
  if(snapshot.authTrigger!=='auth.users/on_auth_user_created/private.handle_new_user')
    fail('FRESH_REPROVISION_AUTH_TRIGGER_DRIFT');
  return Object.freeze({decision:'REVIEW_ONLY',projectRef:DISPOSABLE_FRESH_PROJECT_REF,
    neutralRowTotal:113,appTables:177,catalogMd5:HISTORICAL_SCHEMA_MD5,hostedDatabaseTouched:false});
}

export function compileAtomicReview(root=process.cwd()){
  const source=validateReviewedBaseline(root);
  if(source.decision!=='REVIEW'||source.migrationCount!==59)
    fail('FRESH_REPROVISION_UNREVIEWED_BASELINE');
  const read=path=>readFileSync(resolve(root,path),'utf8');
  const ordered=[
    'BEGIN;',
    "SET LOCAL lock_timeout = '3s';",
    "SET LOCAL statement_timeout = '5min';",
    // Permanent invariant: an emitted plan is NOT runnable until a separately
    // reviewed hosted guard transaction and fault-injection proof have passed.
    "DO $f6_review_only$ BEGIN RAISE EXCEPTION 'FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED'; END $f6_review_only$;",
    'DROP SCHEMA private CASCADE;',
    'DROP SCHEMA public CASCADE;',
    'CREATE SCHEMA public AUTHORIZATION postgres;',
    'CREATE SCHEMA private AUTHORIZATION postgres;',
    read('supabase/customer-baseline/target-preflight.sql'),
    ...source.migrationFiles.map(read),
    read('supabase/customer-baseline/auth-bootstrap.sql'),
    read('supabase/customer-baseline/seed.sql'),
    read('supabase/customer-baseline/target-postflight.sql'),
    'COMMIT;',
  ];
  const sql=ordered.join('\n\n');
  return Object.freeze({
    decision:'REVIEW_ONLY',executionEnabled:false,
    projectRef:DISPOSABLE_FRESH_PROJECT_REF,
    migrationCount:source.migrationCount,reviewedSource:source.reviewedCommit,
    sourceSetSha256:source.sourceSetSha256,sqlSha256:createHash('sha256').update(sql).digest('hex'),
    preflightBeforeMigrations:true,postflightBeforeCommit:true,
    mustAbortBeforeDestructiveSql:true,sql,hostedDatabaseTouched:false,
    limitations:['LIVE_TARGET_LOCKS_UNPROVEN','CROSS_SCHEMA_DEPENDENCIES_UNPROVEN',
      'ROLLBACK_UNPROVEN','STORAGE_MANAGED_STATE_NOT_FRESH','OFFICE_ALAP_PRO_RLS_UNPROVEN'],
  });
}

export function reviewTargetAndReprovision({root=process.cwd(),dbUrl,env=process.env,snapshot}={}){
  const target=assertDisposableDbUrl(dbUrl);
  const safeEnv=assertSafeLibpqEnvironment(env);
  const checked=validateOccupiedTargetSnapshot(snapshot);
  const compiled=compileAtomicReview(root);
  return Object.freeze({
    decision:'REVIEW_ONLY',executionEnabled:HOSTED_EXECUTION_ENABLED,
    projectRef:target.projectRef,connectionKind:target.connectionKind,sslmode:safeEnv.PGSSLMODE,
    catalogMd5:checked.catalogMd5,sourceSetSha256:compiled.sourceSetSha256,
    sqlSha256:compiled.sqlSha256,hostedDatabaseTouched:false,
    limitations:compiled.limitations,
  });
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.slice(2).join(' ')!=='--review-offline'){
    console.error('FRESH_REPROVISION_HOSTED_EXECUTION_DISABLED');
    process.exitCode=1;
  }else{
    try{
      const v=compileAtomicReview(process.cwd());
      console.log(JSON.stringify({
        decision:v.decision,projectRef:v.projectRef,executionEnabled:v.executionEnabled,
        sourceCommit:v.reviewedSource,migrationCount:v.migrationCount,
        sourceSetSha256:v.sourceSetSha256,sqlSha256:v.sqlSha256,
        hostedDatabaseTouched:v.hostedDatabaseTouched,limitations:v.limitations,
      },null,2));
    }catch(e){console.error(e.message);process.exitCode=1;}
  }
}
